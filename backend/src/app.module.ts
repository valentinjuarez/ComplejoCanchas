import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CourtModule } from './court/court.module';

@Module({
  imports: [PrismaModule, CourtModule],
})
export class AppModule {}
