import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminJwtPayload } from './types/jwt-payload.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminJwtPayload => {
    const req = ctx.switchToHttp().getRequest<{ user: AdminJwtPayload }>();
    return req.user;
  },
);
