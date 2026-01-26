import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/reservationDTO';
import { Reserva } from '@prisma/client';
import { UserService } from '../user/user.service';
import * as crypto from 'crypto';
import { DateTime } from 'luxon';
import { Cron } from '@nestjs/schedule';
import { PaymentService } from '../payments/payment.service';
import { CreateHoldReservationDto } from './dto/create-hold.dto';

const AR_TZ = 'America/Argentina/Buenos_Aires';

type HoldCheckoutResponse = {
  reservationId: number;
  status: string;
  expiresAt: Date | null;
  depositAmount: number;
  playersCount: number;
  checkoutUrl: string;
};

@Injectable()
export class ReservationService {
  private readonly CANCELLATION_HOURS_LIMIT = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly payments: PaymentService,
  ) {}

  // =========================
  // CREATE (sin pago)
  // =========================
  async create(dto: CreateReservationDto): Promise<Reserva> {
    const { name, email, courtId, date, startTime, endTime } = dto;

    this.ensureNotInPast(date, startTime);

    const court = await this.validateCourtAvailability(courtId);
    const { dateUTC, startUTC, endUTC } = this.buildTimes(date, startTime, endTime);

    await this.checkTimeSlotAvailability(courtId, dateUTC, startUTC, endUTC);

    const user = await this.userService.createOrGet({ name, email });

    const price = this.calculatePrice(startUTC, endUTC, court.pricePerHour);

    const playersCount = court.playersCount ?? 10;
    if (!Number.isFinite(playersCount) || playersCount <= 0) {
      throw new BadRequestException('La cancha tiene playersCount inválido');
    }

    const depositAmount = price / playersCount;
    const cancelToken = crypto.randomUUID();

    return this.prisma.reserva.create({
      data: {
        courtId,
        userId: user.id,
        date: dateUTC,
        startTime: startUTC,
        endTime: endUTC,
        price,
        depositAmount,
        playersCount,
        cancelToken,
        status: 'ACTIVE',
        refunded: false,
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            active: true,
            pricePerHour: true,
            playersCount: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  // =========================
  // CREATE HOLD + CHECKOUT MP
  // =========================
  async createHoldAndCheckout(dto: CreateHoldReservationDto): Promise<HoldCheckoutResponse> {
    const { name, email, courtId, date, startTime, endTime } = dto;

    this.ensureNotInPast(date, startTime);

    const court = await this.validateCourtAvailability(courtId);
    const { dateUTC, startUTC, endUTC } = this.buildTimes(date, startTime, endTime);

    await this.checkTimeSlotAvailability(courtId, dateUTC, startUTC, endUTC);

    const user = await this.userService.createOrGet({ name, email });

    const price = this.calculatePrice(startUTC, endUTC, court.pricePerHour);

    // ✅ playersCount lo define la cancha (no el usuario)
    const playersCount = court.playersCount ?? 12;
    if (!Number.isFinite(playersCount) || playersCount < 1) {
      throw new BadRequestException('La cancha tiene playersCount inválido');
    }

    // ✅ Seña = lo que paga 1 jugador del total
    const depositAmount = price / playersCount;

    const cancelToken = crypto.randomUUID();
    const expiresAt = DateTime.now().plus({ minutes: 10 }).toUTC().toJSDate();
    const idempotencyKey = crypto.randomUUID().replace(/-/g, '').slice(0, 32);

    const created = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reserva.create({
        data: {
          courtId,
          userId: user.id,
          date: dateUTC,
          startTime: startUTC,
          endTime: endUTC,
          price,
          depositAmount,
          playersCount,
          cancelToken,
          status: 'PENDING_PAYMENT',
          expiresAt,
          refunded: false,
        },
        include: { court: true },
      });

      await tx.payment.create({
        data: {
          reservationId: reservation.id,
          provider: 'MERCADOPAGO',
          status: 'CREATED',
          amount: depositAmount, // ✅ coincide con lo que se cobra
          currency: 'ARS',
        },
      });

      return { reservation };
    });

    // ✅ En MP se cobra SOLO depositAmount (1 jugador)
    const pref = await this.payments.createPreference({
      reservationId: created.reservation.id,
      title: `Seña - ${created.reservation.court.name}`,
      amount: depositAmount, // ✅ acá estaba el error antes
      expiresAt,
      idempotencyKey,
    });

    await this.prisma.payment.update({
      where: { reservationId: created.reservation.id },
      data: { mpPreferenceId: pref.preferenceId },
    });

    return {
      reservationId: created.reservation.id,
      status: created.reservation.status,
      expiresAt: created.reservation.expiresAt,
      depositAmount: created.reservation.depositAmount,
      playersCount: created.reservation.playersCount,
      checkoutUrl: pref.initPoint,
    };
  }

  // ✅ Polling
  async getById(id: number) {
    const reservation = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        court: { select: { id: true, name: true, pricePerHour: true, playersCount: true } },
        user: { select: { id: true, name: true, email: true } },
        payment: true,
      },
    });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    return reservation;
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

    if (!reservation) throw new NotFoundException('Reserva no encontrada o token inválido');
    if (reservation.status === 'CANCELED')
      throw new BadRequestException('La reserva ya está cancelada');

    const now = new Date();
    const hoursUntilReservation =
      (reservation.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilReservation < 0) {
      throw new BadRequestException('No se puede cancelar una reserva que ya pasó');
    }

    const refundApplied = hoursUntilReservation >= this.CANCELLATION_HOURS_LIMIT;

    const updatedReservation = await this.prisma.reserva.update({
      where: { id: reservation.id },
      data: { status: 'CANCELED', canceledAt: new Date(), refunded: refundApplied },
      include: {
        court: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        payment: true,
      },
    });

    const message = refundApplied
      ? `Reserva cancelada. Se te devolverá el monto de $${reservation.depositAmount}.`
      : `Reserva cancelada. No se aplicará reembolso (menos de ${this.CANCELLATION_HOURS_LIMIT} horas).`;

    return { reservation: updatedReservation, refundApplied, message, hoursUntilReservation };
  }

  async getByToken(token: string) {
    if (!token || token.length < 10) throw new BadRequestException('Token inválido');

    const reservation = await this.prisma.reserva.findUnique({
      where: { cancelToken: token },
      include: {
        court: { select: { id: true, name: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!reservation) throw new NotFoundException('Reserva no encontrada o token inválido');

    const now = new Date();
    const hoursUntilReservation =
      (reservation.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const canCancel = reservation.status === 'ACTIVE' && hoursUntilReservation >= 0;
    const refundEligible = canCancel && hoursUntilReservation >= this.CANCELLATION_HOURS_LIMIT;

    const hoursUntilRounded = Math.round(hoursUntilReservation * 100) / 100;

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
        depositAmount: reservation.depositAmount,
        refunded: reservation.refunded,
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
  private async validateCourtAvailability(courtId: number): Promise<{
    playersCount: number;
    id: number;
    active: boolean;
    pricePerHour: number;
  }> {
    const court = await this.prisma.cancha.findUnique({
      where: { id: courtId },
      select: { id: true, active: true, pricePerHour: true, playersCount: true },
    });

    if (!court) throw new NotFoundException(`La cancha con ID ${courtId} no existe`);
    if (!court.active) throw new BadRequestException('La cancha no está disponible');

    return court;
  }

  private async checkTimeSlotAvailability(
    courtId: number,
    dateUTC: Date,
    startUTC: Date,
    endUTC: Date,
  ): Promise<void> {
    const now = new Date();

    const overlapping = await this.prisma.reserva.findFirst({
      where: {
        courtId,
        date: dateUTC,
        OR: [{ status: 'ACTIVE' }, { status: 'PENDING_PAYMENT', expiresAt: { gt: now } }],
        AND: [{ startTime: { lt: endUTC } }, { endTime: { gt: startUTC } }],
      },
      select: { id: true },
    });

    if (overlapping) throw new BadRequestException('Horario no disponible');
  }

  // =========================
  // TIME BUILDERS (AR -> UTC)
  // =========================
  private buildTimes(date: string, startTime: string, endTime: string) {
    const startAR = DateTime.fromISO(`${date}T${startTime}`, { zone: AR_TZ });
    let endAR = DateTime.fromISO(`${date}T${endTime}`, { zone: AR_TZ });

    if (endAR <= startAR) endAR = endAR.plus({ days: 1 });

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

  async markCompletedReservations() {
    const nowUTC = DateTime.now().toUTC().toJSDate();

    await this.prisma.reserva.updateMany({
      where: { status: 'ACTIVE', endTime: { lt: nowUTC } },
      data: { status: 'COMPLETED' },
    });
  }

  @Cron('*/5 * * * *')
  async autoComplete() {
    await this.markCompletedReservations();
  }

  @Cron('*/1 * * * *')
  async expirePendingPayments() {
    const now = new Date();

    await this.prisma.reserva.updateMany({
      where: { status: 'PENDING_PAYMENT', expiresAt: { lt: now } },
      data: { status: 'EXPIRED' },
    });

    await this.prisma.payment.updateMany({
      where: {
        status: { in: ['CREATED', 'PENDING'] },
        reservation: { status: 'EXPIRED' },
      },
      data: { status: 'CANCELLED' },
    });
  }

  private calculatePrice(startUTC: Date, endUTC: Date, pricePerHour: number): number {
    const hours = (endUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60);
    if (hours <= 0) throw new BadRequestException('Duración inválida');
    return hours * pricePerHour;
  }
}
