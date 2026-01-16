import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterReservationsDto } from './dto/filter-reservations.dto';
import { UpdateReservationAdminDto } from './dto/update-reservation-admin.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todas las reservas con filtros avanzados
   */
  async getReservations(filters: FilterReservationsDto) {
    const { name, email, date, courtId, status, from, to, page = 1, limit = 20 } = filters;

    // ✅ Usar el tipo correcto de Prisma
    const where: Prisma.ReservaWhereInput = {};

    // Filtro por usuario (nombre o email)
    if (name || email) {
      where.user = {};
      if (name) {
        where.user.name = {
          contains: name,
          mode: 'insensitive',
        };
      }
      if (email) {
        where.user.email = {
          contains: email,
          mode: 'insensitive',
        };
      }
    }

    // Filtro por cancha
    if (courtId) {
      where.courtId = courtId;
    }

    // Filtro por estado
    if (status) {
      where.status = status;
    }

    // Filtro por fecha específica
    if (date) {
      where.date = new Date(date);
    }

    // Filtro por rango de fechas
    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        where.date.lte = new Date(to);
      }
    }

    // Calcular skip para paginación
    const skip = (page - 1) * limit;

    // Ejecutar consulta con paginación
    const [reservations, total] = await Promise.all([
      this.prisma.reserva.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          court: {
            select: {
              id: true,
              name: true,
              type: true,
              active: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.reserva.count({ where }),
    ]);

    return {
      data: reservations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene una reserva específica con toda la información
   */
  async getReservation(id: number) {
    const reservation = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            type: true,
            active: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    return reservation;
  }

  /**
   * Actualiza una reserva (admin puede modificar cualquier campo)
   */
  async updateReservation(id: number, dto: UpdateReservationAdminDto) {
    // Verificar que la reserva exista
    const reservation = await this.getReservation(id);

    // Si se cambia la cancha, verificar que exista
    if (dto.courtId && dto.courtId !== reservation.courtId) {
      const court = await this.prisma.cancha.findUnique({
        where: { id: dto.courtId },
      });
      if (!court) {
        throw new NotFoundException(`Cancha con ID ${dto.courtId} no encontrada`);
      }
    }

    // Si se cambia fecha/horario, verificar disponibilidad
    if (dto.date || dto.startTime || dto.endTime) {
      const courtId = dto.courtId || reservation.courtId;
      const date = dto.date || reservation.date.toISOString().split('T')[0];
      const startTime =
        dto.startTime || reservation.startTime.toISOString().split('T')[1].substring(0, 5);
      const endTime =
        dto.endTime || reservation.endTime.toISOString().split('T')[1].substring(0, 5);

      await this.checkAvailability(courtId, date, startTime, endTime, id);
    }

    // ✅ Preparar datos para actualizar con tipo correcto
    const updateData: Prisma.ReservaUpdateInput = {};

    if (dto.courtId !== undefined) {
      updateData.court = { connect: { id: dto.courtId } };
    }
    if (dto.userId !== undefined) {
      updateData.user = { connect: { id: dto.userId } };
    }
    if (dto.price !== undefined) {
      updateData.price = dto.price;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    if (dto.date) {
      updateData.date = new Date(`${dto.date}T00:00:00Z`);
    }

    if (dto.startTime) {
      const dateStr = dto.date || reservation.date.toISOString().split('T')[0];
      updateData.startTime = new Date(`${dateStr}T${dto.startTime}:00Z`);
    }

    if (dto.endTime) {
      const dateStr = dto.date || reservation.date.toISOString().split('T')[0];
      updateData.endTime = new Date(`${dateStr}T${dto.endTime}:00Z`);
    }

    return this.prisma.reserva.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  /**
   * Cancela una reserva (admin puede cancelar sin restricciones)
   */
  async cancelReservation(id: number) {
    const reservation = await this.getReservation(id);

    if (reservation.status === 'CANCELED') {
      throw new BadRequestException('La reserva ya está cancelada');
    }

    return this.prisma.reserva.update({
      where: { id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        refunded: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  /**
   * Verifica disponibilidad de horario (excluyendo la reserva actual)
   */
  private async checkAvailability(
    courtId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: number,
  ): Promise<void> {
    const startDateTime = new Date(`${date}T${startTime}:00Z`);
    const endDateTime = new Date(`${date}T${endTime}:00Z`);

    const overlapping = await this.prisma.reserva.findFirst({
      where: {
        courtId,
        date: new Date(`${date}T00:00:00Z`),
        status: 'ACTIVE',
        ...(excludeReservationId !== undefined && {
          id: { not: excludeReservationId },
        }),
        AND: [{ startTime: { lt: endDateTime } }, { endTime: { gt: startDateTime } }],
      },
    });

    if (overlapping) {
      throw new BadRequestException('El horario no está disponible para esta cancha');
    }
  }

  async changeAdminPassword(adminId: number, dto: ChangePasswordDto) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new NotFoundException('Admin no encontrado');
    }
    if (!admin.passwordHash) {
      throw new BadRequestException('El admin no tiene password configurada');
    }

    const ok = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
    if (!ok) throw new BadRequestException('Password actual incorrecta');

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { passwordHash: newHash },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async changeAdminEmail(adminId: number, dto: ChangeEmailDto) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new NotFoundException('Admin no encontrado');
    }
    if (!admin.passwordHash) {
      throw new BadRequestException('El admin no tiene password configurada');
    }

    const ok = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
    if (!ok) throw new BadRequestException('Password actual incorrecta');

    // chequear que el nuevo email no exista
    const exists = await this.prisma.adminUser.findUnique({
      where: { email: dto.newEmail },
      select: { id: true },
    });
    if (exists && exists.id !== adminId) {
      throw new BadRequestException('Ese email ya está en uso');
    }

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { email: dto.newEmail },
    });

    return { message: 'Email actualizado correctamente', email: dto.newEmail };
  }
}
