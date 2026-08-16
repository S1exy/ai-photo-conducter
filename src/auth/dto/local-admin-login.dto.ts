import { IsString, MinLength } from 'class-validator';

export class LocalAdminLoginDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
