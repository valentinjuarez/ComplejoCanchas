// court.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cancha } from '@prisma/client';
import { CreateCourtDto } from './dto/courtDTO';
import { UpdateCourtDto } from './dto/updateCourtDTO';
import { DateTime } from 'luxon';

@Injectable()
export class CourtService {
  private readonly AR_TZ = 'America/Argentina/Buenos_Aires';

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Cancha[]> {
    return this.prisma.cancha.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllIncludingInactive(): Promise<Cancha[]> {
    return this.prisma.cancha.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number): Promise<Cancha> {
    const court = await this.prisma.cancha.findUnique({ where: { id } });
    if (!court) throw new NotFoundException(`Cancha con ID ${id} no encontrada`);
    return court;
  }

  async getAvailability(id: number, date: string) {
    const court = await this.findOne(id);
    if (!court.active) {
      throw new BadRequestException('La cancha no está disponible');
    }

    // Día seleccionado en horario ARG
    const dayStartAR = DateTime.fromISO(date, { zone: this.AR_TZ }).startOf('day');
    const dayEndAR = dayStartAR.plus({ days: 1 });

    // Pasamos a UTC para consultar contra DateTime guardados (UTC)
    const fromUTC = dayStartAR.toUTC().toJSDate();
    const toUTC = dayEndAR.toUTC().toJSDate();

    const reservations = await this.prisma.reserva.findMany({
      where: {
        courtId: id,
        status: 'ACTIVE',
        startTime: { gte: fromUTC, lt: toUTC },
      },
      select: {
        startTime: true,
        endTime: true,
        user: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    const occupiedSlots = reservations.map((r) => ({
      startTime: DateTime.fromJSDate(r.startTime).setZone(this.AR_TZ).toFormat('HH:mm'),
      endTime: DateTime.fromJSDate(r.endTime).setZone(this.AR_TZ).toFormat('HH:mm'),
      reservedBy: r.user.name,
    }));

    const playersCount = court.playersCount ?? 12;
    const depositPerPlayer = playersCount > 0 ? court.pricePerHour / playersCount : 0;

    return {
      court: {
        id: court.id,
        name: court.name,
        type: court.type,
        pricePerHour: court.pricePerHour,
        playersCount,
        depositPerPlayer,
      },
      date,
      occupiedSlots,
      totalReservations: occupiedSlots.length,
    };
  }

  async getStats(id: number) {
    await this.findOne(id);

    const totalReservations = await this.prisma.reserva.count({
      where: { courtId: id },
    });

    // Mejor: "upcoming" por startTime >= ahora
    const now = new Date();
    const upcomingReservations = await this.prisma.reserva.count({
      where: {
        courtId: id,
        status: 'ACTIVE',
        startTime: { gte: now },
      },
    });

    const pastReservations = totalReservations - upcomingReservations;

    return {
      totalReservations,
      upcomingReservations,
      pastReservations,
    };
  }

  async create(dto: CreateCourtDto): Promise<Cancha> {
    const playersCount =
      dto.playersCount !== undefined && dto.playersCount !== null ? Number(dto.playersCount) : 12;

    if (!Number.isFinite(playersCount) || playersCount <= 0) {
      throw new BadRequestException('playersCount debe ser un número > 0');
    }

    return this.prisma.cancha.create({
      data: {
        name: dto.name,
        type: dto.type,
        active: dto.active ?? true,
        pricePerHour: dto.pricePerHour ?? 72000,
        playersCount,
      },
    });
  }

  async update(id: number, dto: UpdateCourtDto): Promise<Cancha> {
    await this.findOne(id);

    const data: any = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.pricePerHour !== undefined) data.pricePerHour = dto.pricePerHour;

    if (dto.playersCount !== undefined) {
      const playersCount = Number(dto.playersCount);
      if (!Number.isFinite(playersCount) || playersCount <= 0) {
        throw new BadRequestException('playersCount debe ser un número > 0');
      }
      data.playersCount = playersCount;
    }

    return this.prisma.cancha.update({
      where: { id },
      data,
    });
  }

  async toggleActive(id: number): Promise<Cancha> {
    const court = await this.findOne(id);
    return this.prisma.cancha.update({
      where: { id },
      data: { active: !court.active },
    });
  }

  async remove(id: number): Promise<Cancha> {
    await this.findOne(id);

    const reservationsCount = await this.prisma.reserva.count({
      where: { courtId: id },
    });

    if (reservationsCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la cancha porque tiene ${reservationsCount} reserva(s) asociada(s). Considerá desactivarla.`,
      );
    }

    return this.prisma.cancha.delete({ where: { id } });
  }
}
