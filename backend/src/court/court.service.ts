import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cancha } from '@prisma/client';

@Injectable()
export class CourtService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Cancha[]> {
    return this.prisma.cancha.findMany({
      where: {
        active: true,
      },
    });
  }
}
