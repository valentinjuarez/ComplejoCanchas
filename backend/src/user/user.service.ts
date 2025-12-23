import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/userDTO';
import { Usuario } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un usuario o retorna el existente si el email ya está registrado
   */
  async createOrGet(dto: CreateUserDto): Promise<Usuario> {
    return this.prisma.usuario.upsert({
      where: { email: dto.email },
      update: { name: dto.name },
      create: { name: dto.name, email: dto.email },
    });
  }

  /**
   * Obtiene todos los usuarios
   */
  async findAll(): Promise<Usuario[]> {
    return this.prisma.usuario.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Busca un usuario por ID
   */
  async findOne(id: number): Promise<Usuario> {
    const user = await this.prisma.usuario.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  /**
   * Busca un usuario por email (retorna null si no existe)
   */
  async findByEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { email } });
  }
}
