import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Protection CSRF des routes qui s'authentifient par cookie (refresh, logout).
 * Les navigateurs envoient toujours l'en-tête Origin sur une requête POST :
 * on n'accepte que celle de notre frontend.
 */
@Injectable()
export class SameOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const allowedOrigin = this.config.getOrThrow<string>('CORS_ORIGIN');

    if (request.headers.origin !== allowedOrigin) {
      throw new ForbiddenException('Origine de la requête non autorisée.');
    }
    return true;
  }
}
