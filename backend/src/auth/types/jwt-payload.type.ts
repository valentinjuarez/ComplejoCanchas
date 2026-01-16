import { AdminRole } from '@prisma/client';

export type AdminJwtPayload = {
  sub: number;
  email: string;
  role: AdminRole;
  type: 'admin';
};
