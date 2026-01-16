import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { AdminRole } from '@prisma/client';

type JwtUser = {
  sub: number;
  email: string;
  role: AdminRole; // <- ahora AdminRole
  type?: 'admin'; // <- opcional, si lo usás en el payload
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // si no hay roles requeridos => pasa
    if (!roles || roles.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = req.user;

    // si querés asegurar que esto es solo para admin tokens:
    if (!user || user.type !== 'admin') return false;

    return roles.includes(user.role);
  }
}
