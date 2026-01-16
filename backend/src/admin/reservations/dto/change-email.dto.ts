import { IsEmail, IsString } from 'class-validator';

export class ChangeEmailDto {
  @IsEmail()
  newEmail: string;

  // Recomendado pedir password para evitar que si roban el token te cambien el email
  @IsString()
  currentPassword: string;
}
