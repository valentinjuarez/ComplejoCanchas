import { Controller, Post, Body, Patch, Get, Param } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/reservationDTO';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Get('by-token/:token')
  getByToken(@Param('token') token: string) {
    return this.reservationService.getByToken(token);
  }
  @Post()
  create(@Body() dto: CreateReservationDto) {
    return this.reservationService.create(dto);
  }
  @Patch('cancel')
  cancel(@Body('token') token: string) {
    return this.reservationService.cancelByToken(token);
  }
}
