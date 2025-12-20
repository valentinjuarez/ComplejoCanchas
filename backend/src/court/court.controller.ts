import { Controller, Get } from '@nestjs/common';
import { CourtService } from './court.service';

@Controller('courts')
export class CourtController {
  constructor(private readonly courtService: CourtService) {}

  @Get()
  findAll() {
    return this.courtService.findAll();
  }
}
