import { Module } from '@nestjs/common';
import { CourtService } from './court.service';
import { CourtController } from './court.controller';

@Module({
  providers: [CourtService],
  controllers: [CourtController],
})
export class CourtModule {}
