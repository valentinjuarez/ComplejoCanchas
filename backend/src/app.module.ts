import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CourtModule } from './court/court.module';
import { ReservationModule } from './reservation/reservation.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/reservations/admin.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentModule } from './payments/payment.module';

@Module({
  imports: [
    PrismaModule,
    CourtModule,
    ReservationModule,
    UserModule,
    AuthModule,
    AdminModule,
    ScheduleModule.forRoot(),
    PaymentModule,
  ],
})
export class AppModule {}
