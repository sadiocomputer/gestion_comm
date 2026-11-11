import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsGuineaPhone } from '../../common/decorators/is-guinea-phone.decorator';

export class LoginDto {
  @IsGuineaPhone()
  phone: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
