import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(1)
  courtId: number;

  // YYYY-MM-DD
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in format YYYY-MM-DD',
  })
  date: string;

  // HH:mm
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'startTime must be in format HH:mm',
  })
  startTime: string;

  // HH:mm
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'endTime must be in format HH:mm',
  })
  endTime: string;
}

