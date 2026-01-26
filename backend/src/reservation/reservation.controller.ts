import { Controller, Post, Body, Patch, Get, Param } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/reservationDTO';
import { CreateHoldReservationDto } from './dto/create-hold.dto';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Get('by-token/:token')
  getByToken(@Param('token') token: string) {
    return this.reservationService.getByToken(token);
  }

  // ✅ Nuevo: HOLD + checkout MP
  @Post('hold')
  createHold(@Body() dto: CreateHoldReservationDto) {
    return this.reservationService.createHoldAndCheckout(dto);
  }

  @Post()
  create(@Body() dto: CreateReservationDto) {
    return this.reservationService.create(dto);
  }

  @Patch('cancel')
  cancel(@Body('token') token: string) {
    return this.reservationService.cancelByToken(token);
  }

  // ✅ Polling / estado
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.reservationService.getById(Number(id));
  }
}
