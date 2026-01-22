import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

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
