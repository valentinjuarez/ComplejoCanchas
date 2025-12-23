import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CourtService } from './court.service';
import { CreateCourtDto } from './dto/courtDTO';
import { UpdateCourtDto } from './dto/updateCourtDTO';

@Controller('courts')
export class CourtController {
  constructor(private readonly courtService: CourtService) {}

  // 🔓 PÚBLICOS

  @Get()
  findAll() {
    return this.courtService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courtService.findOne(id);
  }

  @Get(':id/availability')
  getAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
  ) {
    return this.courtService.getAvailability(id, date);
  }

  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.courtService.getStats(id);
  }

  // 🔒 ADMIN

  @Get('admin/all')
  findAllIncludingInactive() {
    return this.courtService.findAllIncludingInactive();
  }

  @Post()
  create(@Body() dto: CreateCourtDto) {
    return this.courtService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourtDto) {
    return this.courtService.update(id, dto);
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
