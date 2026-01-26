import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { UserModule } from '../user/user.module';
import { PaymentModule } from '../payments/payment.module';

@Module({
  imports: [UserModule, PaymentModule],
  controllers: [ReservationController],
  providers: [ReservationService],
})
export class ReservationModule {}
