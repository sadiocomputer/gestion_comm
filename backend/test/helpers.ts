import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { normalizeGuineaPhone } from '../src/common/utils/phone';
import dataSource from '../src/database/data-source';
import { ExpensesService } from '../src/expenses/expenses.service';
import { UnitsService } from '../src/products/units.service';
import { RolesService } from '../src/roles/roles.service';
import { UsersService } from '../src/users/users.service';

/**
 * Prépare une application de test sur une base NEUVE :
 * 1. vide la base de test et rejoue TOUTES les migrations (on teste aussi
 *    qu'elles créent un schéma complet et cohérent avec les entités) ;
 * 2. démarre l'application avec la même configuration que le vrai serveur ;
 * 3. lance le seed (administrateur, rôles, permissions, unités, catégories).
 */
export async function setupTestApp(): Promise<INestApplication> {
  await dataSource.initialize();
  await dataSource.dropDatabase();
  await dataSource.runMigrations();
  await dataSource.destroy();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  await app.get(UsersService).seedAdminIfEmpty();
  const roles = app.get(RolesService);
  await roles.syncCatalog();
  await roles.grantAdminRole(normalizeGuineaPhone(process.env.ADMIN_PHONE!)!);
  await app.get(UnitsService).seedDefaults();
  await app.get(ExpensesService).seedDefaults();

  return app;
}

export function http(app: INestApplication) {
  return request(app.getHttpServer());
}

/** En-tête Origin attendu par /auth/refresh et /auth/logout. */
export const origin = () => process.env.CORS_ORIGIN!;

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Extrait "refresh_token=..." de la réponse (cookie HttpOnly). */
export function refreshCookie(res: Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | string | undefined;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = list.find((c) => c.startsWith('refresh_token='));
  if (!cookie) throw new Error('Aucun cookie refresh_token dans la réponse.');
  return cookie.split(';')[0];
}

export async function login(
  app: INestApplication,
  phone = process.env.ADMIN_PHONE!,
  password = process.env.ADMIN_PASSWORD!,
) {
  const res = await http(app).post('/api/auth/login').send({ phone, password }).expect(201);
  return {
    token: res.body.accessToken as string,
    cookie: refreshCookie(res),
    user: res.body.user as { id: number; roles: { id: number; name: string }[]; permissions: string[] },
  };
}

/** Date du jour "AAAA-MM-JJ" (même convention UTC que le serveur). */
export const today = () => new Date().toISOString().slice(0, 10);
