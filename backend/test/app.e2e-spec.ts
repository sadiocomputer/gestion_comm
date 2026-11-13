import { INestApplication } from '@nestjs/common';
import { http, setupTestApp } from './helpers';

describe('Application (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    // "?." : si la préparation a échoué, on ne masque pas la vraie erreur.
    await app?.close();
  });

  it('GET /api/health répond ok', () => {
    return http(app).get('/api/health').expect(200).expect({ status: 'ok' });
  });

  it('les routes protégées refusent un visiteur non connecté', async () => {
    for (const path of ['/api/users', '/api/products', '/api/sales', '/api/reports', '/api/dashboard']) {
      await http(app).get(path).expect(401);
    }
  });
})
