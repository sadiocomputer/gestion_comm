import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Paramètres d'URL de GET /users?page=1&limit=20 */
export class ListUsersQueryDto {
  // Les paramètres d'URL arrivent en texte : @Type les convertit en nombre.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
