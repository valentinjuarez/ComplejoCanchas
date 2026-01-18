import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/reservationDTO';
import { Reserva } from '@prisma/client';
import { UserService } from '../user/user.service';
import * as crypto from 'crypto';
import { DateTime } from 'luxon';

const AR_TZ = 'America/Argentina/Buenos_Aires';

@Injectable()
export class ReservationService {
  private readonly BASE_PRICE = 72000;
  private readonly CANCELLATION_HOURS_LIMIT = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  // =========================
  // CREATE
  // =========================
  async create(dto: CreateReservationDto): Promise<Reserva> {
    const { name, email, courtId, date, startTime, endTime } = dto;

    this.ensureNotInPast(date, startTime);

    // Validar cancha

    await this.validateCourtAvailability(courtId);

    // Construimos tiempos de forma consistente (AR -> UTC)
    const { dateUTC, startUTC, endUTC } = this.buildTimes(date, startTime, endTime);

    // Validar solapamiento usando los mismos instantes UTC
    await this.checkTimeSlotAvailability(courtId, dateUTC, startUTC, endUTC);

    // Crear/reutilizar usuario automáticamente
    const user = await this.userService.createOrGet({ name, email });

    const price = this.calculatePrice(startUTC, endUTC);
    const cancelToken = crypto.randomUUID();

    return this.prisma.reserva.create({
      data: {
        courtId,
        userId: user.id,
        date: dateUTC,
        startTime: startUTC,
        endTime: endUTC,
        price,
        cancelToken,
        status: 'ACTIVE',
        refunded: false,
      },
      include: {
        court: {
          select: { id: true, name: true, active: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // =========================
  // CANCEL BY TOKEN
  // =========================
  async cancelByToken(token: string): Promise<{
    reservation: Reserva;
    refundApplied: boolean;
    message: string;
    hoursUntilReservation: number;
  }> {
    const reservation = await this.prisma.reserva.findUnique({
      where: { cancelToken: token },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada o token inválido');
    }

    if (reservation.status === 'CANCELED') {
      throw new BadRequestException('La reserva ya está cancelada');
    }

    // Comparación correcta: timestamps (no convertir now a UTC a mano)
    const now = new Date();

    const hoursUntilReservation =
      (reservation.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilReservation < 0) {
      throw new BadRequestException('No se puede cancelar una reserva que ya pasó');
    }

    const refundApplied = hoursUntilReservation >= this.CANCELLATION_HOURS_LIMIT;

    const updatedReservation = await this.prisma.reserva.update({
      where: { id: reservation.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        refunded: refundApplied,
      },
      include: {
        court: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const message = refundApplied
      ? `Reserva cancelada. Se te devolverá el monto de $${reservation.price}.`
      : `Reserva cancelada. No se aplicará reembolso (menos de ${this.CANCELLATION_HOURS_LIMIT} horas).`;

    return {
      reservation: updatedReservation,
      refundApplied,
      message,
      hoursUntilReservation,
    };
  }

  AR_TZ = 'America/Argentina/Buenos_Aires';

  async getByToken(token: string) {
    if (!token || token.length < 10) {
      throw new BadRequestException('Token inválido');
    }

    const reservation = await this.prisma.reserva.findUnique({
      where: { cancelToken: token },
      include: {
        court: { select: { id: true, name: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada o token inválido');
    }

    const now = new Date();
    const hoursUntilReservation =
      (reservation.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const canCancel = reservation.status === 'ACTIVE' && hoursUntilReservation >= 0;

    const refundEligible = canCancel && hoursUntilReservation >= this.CANCELLATION_HOURS_LIMIT;

    // Si querés devolver horas “redondeadas” para UI
    const hoursUntilRounded = Math.round(hoursUntilReservation * 100) / 100;

    // Opcional: devolver horarios en AR para mostrar lindo
    const startAR = DateTime.fromJSDate(reservation.startTime)
      .setZone(AR_TZ)
      .toFormat('yyyy-LL-dd HH:mm');
    const endAR = DateTime.fromJSDate(reservation.endTime)
      .setZone(AR_TZ)
      .toFormat('yyyy-LL-dd HH:mm');

    return {
      reservation: {
        id: reservation.id,
        status: reservation.status,
        price: reservation.price,
        refunded: reservation.refunded, // esto será true recién después de cancelar
        canceledAt: reservation.canceledAt,
        startTime: startAR,
        endTime: endAR,
        court: reservation.court,
        user: reservation.user,
      },
      canCancel,
      refundEligible,
      hoursUntilReservation: hoursUntilRounded,
    };
  }

  // =========================
  // VALIDATIONS
  // =========================
  private async validateCourtAvailability(courtId: number): Promise<void> {
    const court = await this.prisma.cancha.findUnique({
      where: { id: courtId },
      select: { id: true, active: true },
    });

    if (!court) throw new NotFoundException(`La cancha con ID ${courtId} no existe`);
    if (!court.active) throw new BadRequestException('La cancha no está disponible');
  }

  /**
   * Chequea solapamiento usando instantes UTC (consistentes).
   */
  private async checkTimeSlotAvailability(
    courtId: number,
    dateUTC: Date,
    startUTC: Date,
    endUTC: Date,
  ): Promise<void> {
    const overlapping = await this.prisma.reserva.findFirst({
      where: {
        courtId,
        date: dateUTC,
        status: 'ACTIVE',
        AND: [{ startTime: { lt: endUTC } }, { endTime: { gt: startUTC } }],
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new BadRequestException('Horario no disponible');
    }
  }

  // =========================
  // TIME BUILDERS (AR -> UTC)
  // =========================
  /**
   * Interpreta date/start/end como hora Argentina y la convierte a UTC.
   * También soporta cruces de medianoche (end <= start).
   */
  private buildTimes(date: string, startTime: string, endTime: string) {
    const startAR = DateTime.fromISO(`${date}T${startTime}`, { zone: AR_TZ });
    let endAR = DateTime.fromISO(`${date}T${endTime}`, { zone: AR_TZ });

    // Si el end es <= start, asumimos que termina al día siguiente
    if (endAR <= startAR) endAR = endAR.plus({ days: 1 });

    // Guardamos "date" como inicio del día en AR (convertido a UTC)
    const dayAR = DateTime.fromISO(date, { zone: AR_TZ }).startOf('day');

    return {
      dateUTC: dayAR.toUTC().toJSDate(),
      startUTC: startAR.toUTC().toJSDate(),
      endUTC: endAR.toUTC().toJSDate(),
    };
  }

  private ensureNotInPast(date: string, startTime: string) {
    const startAR = DateTime.fromISO(`${date}T${startTime}`, { zone: AR_TZ });
    if (!startAR.isValid) throw new BadRequestException('Fecha u horario inválido');

    const nowAR = DateTime.now().setZone(AR_TZ);

    if (startAR <= nowAR) {
      throw new BadRequestException(
        'No se puede reservar un horario que ya pasó. Elegí un horario futuro.',
      );
    }
  }

  // =========================
  // PRICE
  // =========================
  private calculatePrice(startUTC: Date, endUTC: Date): number {
    const hours = (endUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60);
    if (hours <= 0) throw new BadRequestException('Duración inválida');
    return hours * this.BASE_PRICE;
  }
}
