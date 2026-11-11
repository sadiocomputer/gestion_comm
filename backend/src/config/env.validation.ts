import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Décrit le fichier .env attendu, comme un DTO décrit un body de requête.
 * Les valeurs par défaut s'appliquent quand la variable est absente.
 */
class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  // Peut être vide en local (ex. root sans mot de passe sous XAMPP/WAMP).
  @IsString()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_ACCESS_SECRET doit contenir au moins 32 caractères.',
  })
  JWT_ACCESS_SECRET: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  JWT_REFRESH_TTL_DAYS: number = 7;

  // Une origine = protocole + hôte (+ port), sans chemin ni "/" final.
  @Matches(/^https?:\/\/[^/\s]+$/, {
    message:
      'CORS_ORIGIN doit être une origine sans "/" final (ex. http://localhost:5173).',
  })
  CORS_ORIGIN: string;

  // Utilisées uniquement par "npm run seed".
  @IsOptional()
  @IsString()
  ADMIN_NAME?: string;

  @IsOptional()
  @IsString()
  ADMIN_PHONE?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: 'ADMIN_PASSWORD doit contenir au moins 8 caractères.',
  })
  ADMIN_PASSWORD?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  // enableImplicitConversion : "3306" (texte du .env) devient 3306 (nombre).
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated);

  if (errors.length > 0) {
    // On n'affiche jamais la valeur fautive : elle peut être un secret.
    const details = errors
      .map(
        (error) =>
          `  - ${error.property} : ${Object.values(error.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Configuration .env invalide :\n${details}`);
  }

  return validated;
}
