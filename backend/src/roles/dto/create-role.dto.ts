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
import { PERMISSIONS, type PermissionCode } from '../permissions.catalog';

export const PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRoleDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(50)
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSION_CODES, { each: true, message: 'Permission inconnue.' })
  permissionCodes: PermissionCode[];
}
