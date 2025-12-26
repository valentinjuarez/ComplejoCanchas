import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { CourtService } from './court.service';

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
  getAvailability(@Param('id', ParseIntPipe) id: number, @Query('date') date: string) {
    return this.courtService.getAvailability(id, date);
  }

  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.courtService.getStats(id);
  }
}
