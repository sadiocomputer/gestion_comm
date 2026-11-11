import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsGuineaPhone } from '../../common/decorators/is-guinea-phone.decorator';

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(120)
  name: string;

  @IsGuineaPhone()
  phone: string;

  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  @MaxLength(128)
  password: string;
}
