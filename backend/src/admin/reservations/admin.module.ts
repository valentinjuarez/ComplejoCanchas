import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { CourtModule } from '../../court/court.module';
import { ReservationModule } from '../../reservation/reservation.module';
import { AdminCourtsController } from '../../admin/courts/admin.courts.controller';
// (si tenés admin reservations controller separado, también se agrega)

@Module({
  imports: [CourtModule, ReservationModule],
  controllers: [AdminController, AdminCourtsController],
  providers: [AdminService],
})
export class AdminModule {}
