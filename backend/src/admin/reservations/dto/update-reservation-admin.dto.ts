import { IsOptional, IsInt, IsString, IsEnum, IsNumber } from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class UpdateReservationAdminDto {
  @IsOptional()
  @IsInt()
  courtId?: number;

  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  startTime?: string; // HH:mm

  @IsOptional()
  @IsString()
  endTime?: string; // HH:mm

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
