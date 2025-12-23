import { Controller, Post, Body, Patch } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/reservationDTO';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  async create(@Body() dto: CreateReservationDto) {
    return await this.reservationService.create(dto);
  }
  @Patch('cancel')
  cancel(@Body('token') token: string) {
    return this.reservationService.cancelByToken(token);
  }
}
