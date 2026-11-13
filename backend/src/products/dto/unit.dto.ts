import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { trim } from '../../common/utils/transforms';

/** Création et renommage d'une unité. */
export class UnitDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: "Indique le nom de l'unité." })
  @MaxLength(20, { message: "Le nom de l'unité doit faire 20 caractères maximum." })
  name: string;
}
