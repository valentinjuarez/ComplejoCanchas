// admin/courts/admin-courts.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CourtService } from '../../court/court.service';
import { CreateCourtDto } from '../../court/dto/courtDTO';
import { UpdateCourtDto } from '../../court/dto/updateCourtDTO';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { AdminRole } from '@prisma/client';

@Controller('admin/courts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN)
export class AdminCourtsController {
  constructor(private readonly courtService: CourtService) {}

  @Get()
  findAllIncludingInactive() {
    return this.courtService.findAllIncludingInactive();
  }

  @Post()
  create(@Body() dto: CreateCourtDto) {
    return this.courtService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourtDto) {
    return this.courtService.update(id, dto);
  }

  // ✅ NUEVO: Endpoint específico para cambiar solo el precio
  @Patch(':id/price')
  updatePrice(
    @Param('id', ParseIntPipe) id: number,
    @Body('pricePerHour') pricePerHour: number,
  ) {
    return this.courtService.update(id, { pricePerHour });
  }

  @Patch(':id/toggle')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.courtService.toggleActive(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.courtService.remove(id);
  }
}