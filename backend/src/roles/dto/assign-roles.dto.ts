import { ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

/** Remplace la liste complète des rôles d'un utilisateur ([] = aucun rôle). */
export class AssignRolesDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds: number[];
}
