import { IsBoolean } from 'class-validator';

export class SetUserStatusDto {
  @IsBoolean({ message: 'isActive doit valoir true ou false.' })
  isActive: boolean;
}
