import { INestApplication } from '@nestjs/common';
import { bearer, http, login, setupTestApp } from './helpers';

describe('Rôles, permissions et utilisateurs (e2e)', () => {
  let app: INestApplication;
  let admin: { token: string; user: { id: number } };
  let testerId: number;
  let testerToken: string;
  let roles: { id: number; name: string; isSystem: boolean }[];

  const TESTER = { name: 'Testeur', phone: '622000000', password: 'Admin12345' };

  beforeAll(async () => {
    app = await setupTestApp();
    admin = await login(app);
    roles = (await http(app).get('/api/roles').set(bearer(admin.token)).expect(200)).body;

    const created = await http(app).post('/api/users').set(bearer(admin.token)).send(TESTER).expect(201);
    testerId = created.body.id;
    expect(created.body.passwordHash).toBeUndefined();
    testerToken = (await login(app, TESTER.phone, TESTER.password)).token;
  });

  afterAll(async () => {
    await app?.close();
  });

  const roleId = (name: string) => roles.find((r) => r.name === name)!.id;

  it('le seed a créé les 4 rôles de base', () => {
    expect(roles.map((r) => r.name)).toEqual(
      expect.arrayContaining(['Administrateur', 'Gestionnaire', 'Vendeur', 'Caissier']),
    );
  });

  it('un utilisateur sans rôle ne peut rien faire', async () => {
    await http(app).get('/api/users').set(bearer(testerToken)).expect(403);
    await http(app).get('/api/products').set(bearer(testerToken)).expect(403);
    // Ventes : il faut sales.read OU sales.create.
    await http(app).get('/api/sales').set(bearer(testerToken)).expect(403);
  });

  it('un rôle attribué s’applique immédiatement, avec le même token', async () => {
    await http(app)
      .put(`/api/users/${testerId}/roles`)
      .set(bearer(admin.token))
      .send({ roleIds: [roleId('Gestionnaire')] })
      .expect(200);

    await http(app).get('/api/users').set(bearer(testerToken)).expect(200);
    // Le Gestionnaire ne peut ni créer d'utilisateur ni de rôle.
    await http(app).post('/api/users').set(bearer(testerToken)).send({ ...TESTER, phone: '629999902' }).expect(403);
    await http(app).post('/api/roles').set(bearer(testerToken)).send({ name: 'Pirate', permissionCodes: [] }).expect(403);
  });

  it('le rôle Administrateur est protégé', async () => {
    // Nom valide (≥ 2 caractères) : sinon la validation répond 400 avant
    // même que la protection du rôle système soit vérifiée.
    await http(app)
      .patch(`/api/roles/${roleId('Administrateur')}`)
      .set(bearer(admin.token))
      .send({ name: 'Super administrateur' })
      .expect(403);
    await http(app).delete(`/api/roles/${roleId('Administrateur')}`).set(bearer(admin.token)).expect(403);
  });

  it('un rôle attribué ne peut pas être supprimé', async () => {
    await http(app).delete(`/api/roles/${roleId('Gestionnaire')}`).set(bearer(admin.token)).expect(409);
  });

  it('il reste toujours au moins un administrateur actif', async () => {
    await http(app).put(`/api/users/${admin.user.id}/roles`).set(bearer(admin.token)).send({ roleIds: [] }).expect(409);
    const me = await http(app).get('/api/auth/me').set(bearer(admin.token)).expect(200);
    expect(me.body.roles.map((r: { name: string }) => r.name)).toContain('Administrateur');

    await http(app).patch(`/api/users/${admin.user.id}/status`).set(bearer(admin.token)).send({ isActive: false }).expect(400);
  });

  it('un compte désactivé est bloqué immédiatement', async () => {
    await http(app).patch(`/api/users/${testerId}/status`).set(bearer(admin.token)).send({ isActive: false }).expect(200);
    await http(app).get('/api/auth/me').set(bearer(testerToken)).expect(401);
    await http(app).post('/api/auth/login').send({ phone: TESTER.phone, password: TESTER.password }).expect(401);
  });
})
