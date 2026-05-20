import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RegisterFirstAdminDto extends LoginDto {
  @IsString()
  @MinLength(2)
  displayName!: string;
}
