// court.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cancha } from '@prisma/client';
import { CreateCourtDto } from './dto/courtDTO';
import { UpdateCourtDto } from './dto/updateCourtDTO';

@Injectable()
export class CourtService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // 🔓 MÉTODOS PÚBLICOS (para usuarios)
  // ============================================

  /**
   * Lista todas las canchas que están activas
   * Ejemplo: Muestra solo canchas disponibles para reservar
   */
  async findAll(): Promise<Cancha[]> {
    return this.prisma.cancha.findMany({
      where: { active: true }, // Solo canchas activas
      orderBy: { name: 'asc' }, // Ordenadas alfabéticamente
    });
  }

  /**
   * Busca una cancha específica por su ID
   * @param id - ID de la cancha a buscar
   * @returns La cancha encontrada
   * @throws NotFoundException si la cancha no existe
   */
  async findOne(id: number): Promise<Cancha> {
    // Buscar la cancha en la base de datos
    const court = await this.prisma.cancha.findUnique({
      where: { id },
    });

    // Si no existe, lanzar error
    if (!court) {
      throw new NotFoundException(`Cancha con ID ${id} no encontrada`);
    }

    return court;
  }

  /**
   * Muestra qué horarios están ocupados en una cancha para una fecha
   * Ejemplo: Ver qué horas están reservadas el 25/12/2024
   *
   * @param id - ID de la cancha
   * @param date - Fecha a consultar (formato: "2024-12-25")
   * @returns Objeto con horarios ocupados y detalles
   */
  async getAvailability(id: number, date: string) {
    // 1️ Verificar que la cancha exista
    const court = await this.findOne(id);

    // 2️ Verificar que la cancha esté activa (disponible para reservas)
    if (!court.active) {
      throw new BadRequestException('La cancha no está disponible');
    }

    // 3️ Buscar todas las reservas de esta cancha en esta fecha
    const reservations = await this.prisma.reserva.findMany({
      where: {
        courtId: id, // De esta cancha
        date: new Date(date), // En esta fecha
      },
      select: {
        // Solo traer lo necesario
        startTime: true,
        endTime: true,
        user: {
          select: {
            name: true, // Nombre de quien reservó
          },
        },
      },
      orderBy: {
        startTime: 'asc', // Ordenar por hora de inicio
      },
    });

    // 4️ Formatear las reservas para que sean más legibles
    // Convertir de Date a "10:00", "14:30", etc.
    const occupiedSlots = reservations.map((reservation) => ({
      startTime: this.formatTime(reservation.startTime),
      endTime: this.formatTime(reservation.endTime),
      reservedBy: reservation.user.name,
    }));

    // 5️ Retornar respuesta estructurada
    return {
      court: {
        id: court.id,
        name: court.name,
      },
      date,
      occupiedSlots, // Array de horarios ocupados
      totalReservations: occupiedSlots.length,
    };
  }

  /**
   * Obtiene estadísticas de uso de una cancha
   * @param id - ID de la cancha
   * @returns Objeto con estadísticas (total, futuras, pasadas)
   */
  async getStats(id: number) {
    // Verificar que la cancha exista
    await this.findOne(id);

    // Contar todas las reservas de esta cancha
    const totalReservations = await this.prisma.reserva.count({
      where: { courtId: id },
    });

    // Contar solo las reservas futuras (desde hoy en adelante)
    const upcomingReservations = await this.prisma.reserva.count({
      where: {
        courtId: id,
        date: {
          gte: new Date(), // gte = "greater than or equal" (mayor o igual a hoy)
        },
      },
    });

    // Calcular reservas pasadas restando
    const pastReservations = totalReservations - upcomingReservations;

    return {
      totalReservations, // Total histórico
      upcomingReservations, // Próximas
      pastReservations, // Ya ocurridas
    };
  }

  // ============================================
  // 🔒 MÉTODOS ADMIN (para administradores)
  // ============================================

  /**
   * Crea una nueva cancha
   * @param dto - Datos de la cancha (nombre, activa)
   * @returns La cancha creada
   */
  async create(dto: CreateCourtDto): Promise<Cancha> {
    return this.prisma.cancha.create({
      data: {
        name: dto.name,
        type: dto.type,
        active: dto.active ?? true, // Si no especifican, por defecto activa
      },
    });
  }

  /**
   * Actualiza los datos de una cancha existente
   * @param id - ID de la cancha a actualizar
   * @param dto - Nuevos datos (nombre y/o estado activo)
   * @returns La cancha actualizada
   */
  async update(id: number, dto: UpdateCourtDto): Promise<Cancha> {
    // Verificar que la cancha exista antes de actualizar
    await this.findOne(id);

    // Actualizar solo los campos que vienen en el DTO
    return this.prisma.cancha.update({
      where: { id },
      data: {
        // Solo actualizar si el campo existe en el DTO
        ...(dto.name && { name: dto.name }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  /**
   * Cambia el estado de una cancha (activa ↔ inactiva)
   * Ejemplo: Si está activa la desactiva, si está inactiva la activa
   * Útil para poner canchas en mantenimiento temporalmente
   *
   * @param id - ID de la cancha
   * @returns La cancha con el estado cambiado
   */
  async toggleActive(id: number): Promise<Cancha> {
    // 1️⃣ Buscar la cancha para ver su estado actual
    const court = await this.findOne(id);

    // 2️⃣ Invertir el estado: true → false o false → true
    return this.prisma.cancha.update({
      where: { id },
      data: {
        active: !court.active, // Operador NOT (invierte el booleano)
      },
    });
  }

  /**
   * Elimina una cancha de la base de datos
   * ⚠️ IMPORTANTE: Solo se puede eliminar si NO tiene reservas
   *
   * @param id - ID de la cancha a eliminar
   * @returns La cancha eliminada
   * @throws BadRequestException si tiene reservas asociadas
   */
  async remove(id: number): Promise<Cancha> {
    // 1️ Verificar que la cancha exista
    await this.findOne(id);

    // 2️ Contar cuántas reservas tiene esta cancha
    const reservationsCount = await this.prisma.reserva.count({
      where: { courtId: id },
    });

    // 3️ Si tiene reservas, NO permitir eliminar
    if (reservationsCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la cancha porque tiene ${reservationsCount} reserva(s) asociada(s). Considere desactivarla en su lugar.`,
      );
    }

    // 4️ Si no tiene reservas, eliminar
    return this.prisma.cancha.delete({
      where: { id },
    });
  }

  /**
   * Lista TODAS las canchas (activas e inactivas)
   * Solo para administradores que necesitan ver todo
   * @returns Array con todas las canchas
   */
  async findAllIncludingInactive(): Promise<Cancha[]> {
    return this.prisma.cancha.findMany({
      // Sin filtro "where", trae todo
      orderBy: { name: 'asc' },
    });
  }

  // ============================================
  // 🛠️ MÉTODOS AUXILIARES (privados)
  // ============================================

  /**
   * Convierte un objeto Date a formato "HH:mm" (ejemplo: "14:30")
   * @param date - Objeto Date con hora
   * @returns String con formato "HH:mm"
   */
  private formatTime(date: Date): string {
    // toISOString() retorna: "2024-12-25T14:30:00.000Z"
    // split('T')[1] toma la parte de la hora: "14:30:00.000Z"
    // substring(0, 5) toma solo: "14:30"
    return date.toISOString().split('T')[1].substring(0, 5);
  }
}
