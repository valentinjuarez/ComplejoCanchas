import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AdminRole } from '@prisma/client';
import { AdminJwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async adminLogin(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, role: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Si solo existe ADMIN como rol, igual lo dejamos por prolijidad
    if (admin.role !== AdminRole.ADMIN) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role, // AdminRole
      type: 'admin', // 👈 útil para diferenciar del mundo "public users"
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
    };
  }
}
