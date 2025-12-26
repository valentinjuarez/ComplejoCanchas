import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { FilterReservationsDto } from './dto/filter-reservations.dto';
import { UpdateReservationAdminDto } from './dto/update-reservation-admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Obtiene todas las reservas con filtros opcionales
   * GET /admin/reservations?name=Juan&email=juan@gmail.com&date=2025-12-25&courtId=1&status=ACTIVE&from=2025-12-01&to=2025-12-31
   */
  @Get('reservations')
  getReservations(@Query() filters: FilterReservationsDto) {
    return this.adminService.getReservations(filters);
  }

  /**
   * Obtiene una reserva específica por ID
   * GET /admin/reservations/1
   */
  @Get('reservations/:id')
  getReservation(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getReservation(id);
  }

  /**
   * Actualiza una reserva
   * PATCH /admin/reservations/1
   */
  @Patch('reservations/:id')
  updateReservation(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReservationAdminDto) {
    return this.adminService.updateReservation(id, dto);
  }

  /**
   * Cancela una reserva (admin puede cancelar cualquier reserva)
   * PATCH /admin/reservations/1/cancel
   */
  @Patch('reservations/:id/cancel')
  cancelReservation(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.cancelReservation(id);
  }
}
