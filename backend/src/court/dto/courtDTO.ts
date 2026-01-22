import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCourtDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  playersCount?: number;
}
