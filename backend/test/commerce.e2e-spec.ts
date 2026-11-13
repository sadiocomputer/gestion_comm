import { INestApplication } from '@nestjs/common';
import { bearer, http, login, setupTestApp, today } from './helpers';

/**
 * Parcours complet d'une journée : catalogue, stock, ventes, paiements,
 * annulations, dépenses, puis vérification des chiffres du rapport.
 */
describe('Commerce : stock, ventes, paiements, dépenses, rapports (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let productId: number;
  let supplierId: number;
  let clientId: number;

  const api = () => http(app);
  const auth = () => bearer(token);
  const stockOf = async () => (await api().get(`/api/products/${productId}`).set(auth()).expect(200)).body.quantity as number;

  beforeAll(async () => {
    app = await setupTestApp();
    token = (await login(app)).token;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('crée le catalogue et enregistre une entrée de stock', async () => {
    const category = await api().post('/api/categories').set(auth()).send({ name: 'Alimentation' }).expect(201);
    supplierId = (await api().post('/api/suppliers').set(auth()).send({ name: 'Sodigui' }).expect(201)).body.id;

    const product = await api()
      .post('/api/products')
      .set(auth())
      .send({
        name: 'Riz 25 kg',
        categoryId: category.body.id,
        unit: 'sac',
        purchasePrice: 1000,
        salePrice: 1500,
        minStock: 2,
        initialQuantity: 10,
      })
      .expect(201);
    productId = product.body.id;
    expect(product.body.quantity).toBe(10);

    const entry = await api()
      .post(`/api/products/${productId}/stock/in`)
      .set(auth())
      .send({ quantity: 5, unitCost: 1200, supplierId })
      .expect(201);
    expect(entry.body.quantityAfter).toBe(15);

    const reloaded = await api().get(`/api/products/${productId}`).set(auth()).expect(200);
    expect(reloaded.body.quantity).toBe(15);
    expect(reloaded.body.purchasePrice).toBe(1200); // dernier prix d'achat

    // Dette fournisseur : 5 × 1 200.
    const account = await api().get(`/api/suppliers/${supplierId}/account`).set(auth()).expect(200);
    expect(account.body.balance).toBe(6000);

    // Historique paginé du fournisseur.
    const purchases = (await api().get(`/api/suppliers/${supplierId}/purchases`).query({ limit: 10 }).set(auth()).expect(200)).body;
    expect(purchases).toMatchObject({ total: 1, page: 1, limit: 10 });
    expect(purchases.data[0]).toMatchObject({ quantity: 5, unitCost: 1200, total: 6000 });
    const payments = (await api().get(`/api/suppliers/${supplierId}/payments`).set(auth()).expect(200)).body;
    expect(payments).toMatchObject({ data: [], total: 0, page: 1, limit: 20 });

    await api().get(`/api/suppliers/${supplierId}/purchases`).query({ limit: 500 }).set(auth()).expect(400); // max 100
    await api().get('/api/suppliers/999999/payments').set(auth()).expect(404);
  });

  it('filtre les mouvements de stock par date', async () => {
    const list = (from: string, to: string) =>
      api().get('/api/stock-movements').query({ productId, from, to }).set(auth()).expect(200);

    // Stock initial + entrée : 2 mouvements aujourd'hui, aucun en l'an 2000.
    expect((await list(today(), today())).body.total).toBe(2);
    expect((await list('2000-01-01', '2000-12-31')).body.total).toBe(0);
    await api().get('/api/stock-movements').query({ from: '12/11/2026' }).set(auth()).expect(400);
  });

  it('refuse une sortie supérieure au stock', async () => {
    await api().post(`/api/products/${productId}/stock/out`).set(auth()).send({ quantity: 100, reason: 'test' }).expect(400);
    expect(await stockOf()).toBe(15);
  });

  it('vente payée : stock diminué, facture soldée', async () => {
    const sale = await api()
      .post('/api/sales')
      .set(auth())
      .send({ items: [{ productId, quantity: 2 }], payment: { amount: 3000, method: 'CASH' } })
      .expect(201);
    expect(sale.body.total).toBe(3000);
    expect(sale.body.paymentStatus).toBe('PAID');
    expect(sale.body.number).toMatch(/^F\d{4}-\d{6}$/);
    expect(await stockOf()).toBe(13);
  });

  it('stock insuffisant : la vente entière est refusée et rien ne bouge', async () => {
    await api().post('/api/sales').set(auth()).send({ items: [{ productId, quantity: 100 }] }).expect(400);
    expect(await stockOf()).toBe(13);
  });

  it('refuse une vente à crédit sans client', async () => {
    await api()
      .post('/api/sales')
      .set(auth())
      .send({ items: [{ productId, quantity: 1 }], payment: { amount: 500, method: 'CASH' } })
      .expect(400);
  });

  it('vente à crédit, encaissements, annulations', async () => {
    clientId = (await api().post('/api/clients').set(auth()).send({ name: 'Mamadou Diallo' }).expect(201)).body.id;

    const sale = await api()
      .post('/api/sales')
      .set(auth())
      .send({ clientId, items: [{ productId, quantity: 1 }], payment: { amount: 500, method: 'ORANGE_MONEY' } })
      .expect(201);
    expect(sale.body.paymentStatus).toBe('PARTIAL');
    expect(sale.body.balance).toBe(1000);
    expect(await stockOf()).toBe(12);

    const receivables = await api().get('/api/receivables').set(auth()).expect(200);
    expect(receivables.body.totalBalance).toBe(1000);

    // Compte client : factures à encaisser paginées, totaux sur l'ensemble.
    const account = (await api().get(`/api/clients/${clientId}/account`).query({ limit: 10 }).set(auth()).expect(200)).body;
    expect(account).toMatchObject({ balance: 1000, unpaidCount: 1, page: 1, limit: 10 });
    expect(account.unpaidSales).toHaveLength(1);
    const page2 = (await api().get(`/api/clients/${clientId}/account`).query({ page: 2, limit: 10 }).set(auth()).expect(200)).body;
    expect(page2.unpaidSales).toHaveLength(0);
    expect(page2.balance).toBe(1000);

    // On ne peut pas encaisser plus que le reste.
    await api().post(`/api/sales/${sale.body.id}/payments`).set(auth()).send({ amount: 2000, method: 'CASH' }).expect(400);
    await api().post(`/api/sales/${sale.body.id}/payments`).set(auth()).send({ amount: 1000, method: 'CASH' }).expect(201);

    let detail = (await api().get(`/api/sales/${sale.body.id}`).set(auth()).expect(200)).body;
    expect(detail.paymentStatus).toBe('PAID');

    // Une vente avec des paiements ne s'annule pas directement.
    await api().post(`/api/sales/${sale.body.id}/cancel`).set(auth()).send({ reason: 'test' }).expect(409);

    for (const payment of detail.payments) {
      await api().post(`/api/payments/${payment.id}/cancel`).set(auth()).send({ reason: 'remboursement' }).expect(201);
    }
    detail = (await api().post(`/api/sales/${sale.body.id}/cancel`).set(auth()).send({ reason: 'client a rendu' }).expect(201)).body;
    expect(detail.status).toBe('CANCELLED');
    expect(await stockOf()).toBe(13); // stock restitué
  });

  it('dépenses : enregistrement et date future refusée', async () => {
    const categories = (await api().get('/api/expense-categories').set(auth()).expect(200)).body as { id: number; name: string }[];
    const rent = categories.find((c) => c.name === 'Loyer')!;

    await api().post('/api/expenses').set(auth()).send({ categoryId: rent.id, amount: 400, description: 'Loyer test' }).expect(201);
    await api()
      .post('/api/expenses')
      .set(auth())
      .send({ categoryId: rent.id, amount: 400, description: 'Futur', expenseDate: '2999-01-01' })
      .expect(400);
  });

  it('le rapport du jour est juste', async () => {
    const report = (await api().get('/api/reports').query({ from: today(), to: today() }).set(auth()).expect(200)).body;

    // Seule la 1re vente compte (la vente à crédit a été annulée).
    expect(report.result.revenue).toBe(3000);
    expect(report.result.salesCount).toBe(1);
    expect(report.result.costOfGoodsSold).toBe(2400); // 2 × 1 200 (prix d'achat au moment de la vente)
    expect(report.result.grossMargin).toBe(600);
    expect(report.result.expenses).toBe(400);
    expect(report.result.netProfit).toBe(200);
    expect(report.cash.cashIn).toBe(3000); // paiements annulés exclus
    expect(report.snapshot.supplierDebts).toBe(6000);
  });

  it('un vendeur ne voit que ses propres ventes', async () => {
    const roles = (await api().get('/api/roles').set(auth()).expect(200)).body as { id: number; name: string }[];
    const seller = { name: 'Vendeur Test', phone: '623000000', password: 'Vendeur123!' };
    const sellerId = (await api().post('/api/users').set(auth()).send(seller).expect(201)).body.id;
    await api()
      .put(`/api/users/${sellerId}/roles`)
      .set(auth())
      .send({ roleIds: [roles.find((r) => r.name === 'Vendeur')!.id] })
      .expect(200);
    const sellerToken = (await login(app, seller.phone, seller.password)).token;

    // Aucune vente à lui : liste vide, et la vente de l'admin est invisible.
    const before = (await api().get('/api/sales').set(bearer(sellerToken)).expect(200)).body;
    expect(before.total).toBe(0);
    const adminSales = (await api().get('/api/sales').set(auth()).expect(200)).body.data as { id: number }[];
    await api().get(`/api/sales/${adminSales[0].id}`).set(bearer(sellerToken)).expect(404);

    // Il vend (sans encaisser : il n'a pas payments.create), puis voit sa vente.
    await api().post('/api/sales').set(bearer(sellerToken)).send({ items: [{ productId, quantity: 1 }] }).expect(201);
    const after = (await api().get('/api/sales').set(bearer(sellerToken)).expect(200)).body;
    expect(after.total).toBe(1);
    expect(after.data[0].paymentStatus).toBe('UNPAID');

    // Pas d'accès aux rapports.
    await api().get('/api/reports').query({ from: today(), to: today() }).set(bearer(sellerToken)).expect(403);

    // Tableau de bord du vendeur : ni bénéfice, ni ventes globales, ni dépenses.
    const dashboard = (await api().get('/api/dashboard').set(bearer(sellerToken)).expect(200)).body;
    expect(dashboard.profit).toBeNull();
    expect(dashboard.sales).toBeNull();
    expect(dashboard.expenses).toBeNull();
  });

  it('le tableau de bord répond avec les chiffres du jour', async () => {
    const dashboard = (await api().get('/api/dashboard').set(auth()).expect(200)).body;
    // 3 000 (vente payée) + 1 500 (vente du vendeur, non encaissée)…
    expect(dashboard.sales.total).toBe(4500);
    // … mais l'argent reçu ne compte que ce qui a été réellement encaissé.
    expect(dashboard.cash).toBe(3000);
    expect(dashboard.period).toMatchObject({ from: today(), to: today(), days: 1 });
    // Une seule journée : le graphique montre quand même 7 jours.
    expect(dashboard.chart.points).toHaveLength(7);

    // Bénéfice (Administrateur) : identique au calcul de la page Rapports.
    const report = (await api().get('/api/reports').query({ from: today(), to: today() }).set(auth()).expect(200)).body;
    expect(dashboard.profit.netProfit).toBe(report.result.netProfit);
    expect(dashboard.profit.expenses).toBe(400);

    // Période personnalisée et contrôles.
    const custom = (await api().get('/api/dashboard').query({ from: '2026-01-01', to: '2026-03-31' }).set(auth()).expect(200)).body;
    expect(custom.chart.granularity).toBe('month');
    expect(custom.chart.points).toHaveLength(3);
    await api().get('/api/dashboard').query({ from: '2026-03-01', to: '2026-01-01' }).set(auth()).expect(400);
    await api().get('/api/dashboard').query({ from: '2024-01-01', to: '2026-01-01' }).set(auth()).expect(400);
  });
})
