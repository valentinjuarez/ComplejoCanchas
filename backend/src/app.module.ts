import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CourtModule } from './court/court.module';
import { ReservationModule } from './reservation/reservation.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [PrismaModule, CourtModule, ReservationModule, UserModule],
})
export class AppModule {}
