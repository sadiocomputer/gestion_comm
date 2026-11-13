import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthService } from '../src/auth/auth.service';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity';
import { bearer, http, login, origin, refreshCookie, setupTestApp } from './helpers';

describe('Authentification (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('refuse un mauvais mot de passe avec un message générique', async () => {
    const res = await http(app)
      .post('/api/auth/login')
      .send({ phone: process.env.ADMIN_PHONE, password: 'mauvais-mot-de-passe' })
      .expect(401);
    expect(res.body.message).toBe('Téléphone ou mot de passe incorrect.');
  });

  it('accepte le numéro écrit au format international et renvoie rôles et permissions', async () => {
    const session = await login(app, '+224 620 00 00 00')
    expect(session.token).toBeTruthy();
    expect(session.user.roles.map((r) => r.name)).toContain('Administrateur');
    expect(session.user.permissions).toEqual(expect.arrayContaining(['users.create', 'reports.read']));

    const me = await http(app).get('/api/auth/me').set(bearer(session.token)).expect(200);
    expect(me.body.passwordHash).toBeUndefined(); // jamais de hash dans les réponses
  });

  it('refresh : rotation du jeton, refus sans Origin, détection de réutilisation, logout', async () => {
    const { cookie: first } = await login(app);

    // Sans en-tête Origin : protection CSRF.
    await http(app).post('/api/auth/refresh').set('Cookie', first).expect(403);

    // Avec Origin : nouveau jeton.
    const refreshed = await http(app).post('/api/auth/refresh').set('Cookie', first).set('Origin', origin()).expect(201);
    const second = refreshCookie(refreshed);
    expect(second).not.toBe(first);
    expect(refreshed.body.accessToken).toBeTruthy();

    // L'ancien jeton (déjà utilisé) est refusé…
    await http(app).post('/api/auth/refresh').set('Cookie', first).set('Origin', origin()).expect(401);
    // … mais, réutilisé dans les 10 s, il ne ferme pas la nouvelle session.
    const third = refreshCookie(
      await http(app).post('/api/auth/refresh').set('Cookie', second).set('Origin', origin()).expect(201),
    );

    // Déconnexion : le jeton ne fonctionne plus.
    await http(app).post('/api/auth/logout').set('Cookie', third).set('Origin', origin()).expect(201);
    await http(app).post('/api/auth/refresh').set('Cookie', third).set('Origin', origin()).expect(401);
  });

  it('changement de mot de passe : refuse un mot de passe actuel faux', async () => {
    const { token } = await login(app);
    await http(app)
      .patch('/api/auth/password')
      .set(bearer(token))
      .send({ currentPassword: 'pas-le-bon', newPassword: 'NouveauMotDePasse1' })
      .expect(401);
  });

  it('purge les jetons de session expirés, garde les valides', async () => {
    const { cookie } = await login(app);
    const repo = app.get(DataSource).getRepository(RefreshToken);
    await repo.save(
      repo.create({
        userId: 1,
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date(Date.now() - 60_000), // expiré depuis 1 minute
        revokedAt: null,
      }),
    );

    const removed = await app.get(AuthService).purgeExpiredTokens();
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await repo.findOneBy({ tokenHash: 'a'.repeat(64) })).toBeNull();

    // La session en cours fonctionne toujours.
    await http(app).post('/api/auth/refresh').set('Cookie', cookie).set('Origin', origin()).expect(201);
  });

  it('refuse les champs inconnus envoyés au serveur (whitelist)', async () => {
    await http(app)
      .post('/api/auth/login')
      .send({ phone: process.env.ADMIN_PHONE, password: process.env.ADMIN_PASSWORD, isAdmin: true })
      .expect(400);
  });
})
