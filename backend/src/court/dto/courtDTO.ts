import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCourtDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  type: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean; // opcional, si no lo mandás, Prisma usa default(true)
}
