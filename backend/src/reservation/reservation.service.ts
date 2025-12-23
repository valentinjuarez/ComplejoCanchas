import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/reservationDTO';
import { Reserva } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ReservationService {
  private readonly BASE_PRICE = 72000;
  private readonly CANCELLATION_HOURS_LIMIT = 3;

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReservationDto): Promise<Reserva> {
    const { courtId, userId, date, startTime, endTime } = dto;

    await this.validateCourtAvailability(courtId);
    await this.checkTimeSlotAvailability(courtId, date, startTime, endTime);

    const price = this.calculatePrice();
    const cancelToken = crypto.randomUUID();

    // ✅ Crear fechas en UTC para evitar problemas de zona horaria
    const startDateTime = new Date(`${date}T${startTime}:00Z`); // ← Agregar :00Z
    const endDateTime = new Date(`${date}T${endTime}:00Z`); // ← Agregar :00Z

    return this.prisma.reserva.create({
      data: {
        courtId,
        userId,
        date: new Date(`${date}T00:00:00Z`), // ← UTC
        startTime: startDateTime,
        endTime: endDateTime,
        price,
        cancelToken,
        status: 'ACTIVE',
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            active: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  private async validateCourtAvailability(courtId: number): Promise<void> {
    const court = await this.prisma.cancha.findUnique({
      where: { id: courtId },
      select: { id: true, active: true },
    });

    if (!court) {
      throw new NotFoundException(`La cancha con ID ${courtId} no existe`);
    }

    if (!court.active) {
      throw new BadRequestException('La cancha no está disponible');
    }
  }

  private async checkTimeSlotAvailability(
    courtId: number,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    // ✅ Usar formato ISO con Z para UTC
    const reservationDate = new Date(`${date}T00:00:00Z`);
    const startDateTime = new Date(`${date}T${startTime}:00Z`);
    const endDateTime = new Date(`${date}T${endTime}:00Z`);

    const overlapping = await this.prisma.reserva.findFirst({
      where: {
        courtId,
        date: reservationDate,
        status: 'ACTIVE',
        AND: [
          { startTime: { lt: endDateTime } },
          { endTime: { gt: startDateTime } },
        ],
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new BadRequestException('Horario no disponible');
    }
  }

  private calculatePrice(): number {
    return this.BASE_PRICE;
  }

  /**
   * Cancela una reserva usando el token de cancelación
   * - Si cancela con 3+ horas de anticipación → Reembolso
   * - Si cancela con menos de 3 horas → Sin reembolso
   */
  async cancelByToken(token: string): Promise<{
    reservation: any;
    refundApplied: boolean;
    message: string;
  }> {
    // 1️⃣ Buscar la reserva
    const reservation = await this.prisma.reserva.findUnique({
      where: { cancelToken: token },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada o token inválido');
    }

    // 2️⃣ Verificar que no esté ya cancelada
    if (reservation.status === 'CANCELED') {
      throw new BadRequestException('La reserva ya está cancelada');
    }

    // 3️⃣ Calcular cuántas horas faltan para el turno
    const now = new Date(); // Hora actual en tu zona horaria
    const reservationDateTime = new Date(reservation.startTime); // Ya está en UTC desde la BD

    // ✅ Convertir 'now' a UTC para comparar correctamente
    const nowUTC = new Date(now.toISOString());

    const hoursUntilReservation = this.getHoursDifference(
      nowUTC,
      reservationDateTime,
    );

    console.log('⏰ Horas hasta la reserva:', hoursUntilReservation);

    // 4️⃣ Verificar si ya pasó el turno
    if (hoursUntilReservation < 0) {
      throw new BadRequestException(
        'No se puede cancelar una reserva que ya pasó',
      );
    }

    // 5️⃣ Determinar si aplica reembolso
    const refundApplied =
      hoursUntilReservation >= this.CANCELLATION_HOURS_LIMIT;

    // 6️⃣ Actualizar la reserva
    const updatedReservation = await this.prisma.reserva.update({
      where: { id: reservation.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        refunded: refundApplied,
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 7️⃣ Generar mensaje apropiado
    let message: string;
    if (refundApplied) {
      message = `Reserva cancelada exitosamente. Se te devolverá el monto de $${reservation.price}. El reembolso se procesará en 5-7 días hábiles.`;
    } else {
      message = `Reserva cancelada. No se aplicará reembolso porque la cancelación fue realizada con menos de ${this.CANCELLATION_HOURS_LIMIT} horas de anticipación.`;
    }

    // 8️⃣ TODO: Aquí integrarías el sistema de pagos
    if (refundApplied) {
      console.log(
        `💰 Reembolso pendiente: $${updatedReservation.price} para usuario ${updatedReservation.user}`,
      );
    }

    return {
      reservation: updatedReservation,
      refundApplied,
      message,
    };
  }

  /**
   * Calcula la diferencia en horas entre dos fechas
   * @returns Número de horas (puede ser negativo si date2 es anterior a date1)
   */
  private getHoursDifference(date1: Date, date2: Date): number {
    // Forzar comparación en milisegundos UTC
    const diffInMs = date2.getTime() - date1.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours;
  }
}
