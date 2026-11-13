import { IsBoolean } from 'class-validator';

/** isActive: false = archiver ; true = réactiver. */
export class SetClientStatusDto {
  @IsBoolean({ message: 'isActive doit valoir true ou false.' })
  isActive: boolean;
}
