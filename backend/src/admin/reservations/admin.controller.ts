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
import { AdminRole } from '@prisma/client';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { CurrentUser } from '../../auth/current-user.decorator';
import * as jwtPayloadType from '../../auth/types/jwt-payload.type';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN)
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

  /**
   * Cambia la contraseña del administrador autenticado
   * PATCH /admin/me/password
   *
   * Body: ChangePasswordDto (contraseña actual y nueva contraseña)
   * Respuesta: confirmación de cambio de contraseña
   */
  @Patch('me/password')
  changeMyPassword(
    @CurrentUser() user: jwtPayloadType.AdminJwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.adminService.changeAdminPassword(user.sub, dto);
  }
  /**
   * Cambia el correo electrónico del administrador autenticado
   * PATCH /admin/me/email
   *
   * Body: ChangeEmailDto
   * Response: información de confirmación o estado de la operación
   */
  @Patch('me/email')
  changeMyEmail(@CurrentUser() user: jwtPayloadType.AdminJwtPayload, @Body() dto: ChangeEmailDto) {
    return this.adminService.changeAdminEmail(user.sub, dto);
  }
}
