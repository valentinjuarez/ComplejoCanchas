import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly jwt: JwtService,
  ) {}

  async adminLogin(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || user.role !== Role.ADMIN || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: user.id, role: user.role, email: user.email };
    return {
      accessToken: await this.jwt.signAsync(payload),
    };
  }
}
