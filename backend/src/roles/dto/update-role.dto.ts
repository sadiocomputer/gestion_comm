import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { PermissionCode } from '../permissions.catalog';
import { PERMISSION_CODES } from './create-role.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Tous les champs sont facultatifs : on n'envoie que ce qui change. */
export class UpdateRoleDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSION_CODES, { each: true, message: 'Permission inconnue.' })
  permissionCodes?: PermissionCode[];
}
