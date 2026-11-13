import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentsService } from '../payments/payments.service';
import { SupplierPaymentsService } from '../payments/supplier-payments.service';

type Row = Record<string, string | number | null>;
const num = (value: unknown) => Number(value ?? 0);

/** Nombre de jours entre deux dates "AAAA-MM-JJ", bornes incluses. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

/** Vérifie une période (début ≤ fin, un an maximum) et renvoie son nombre de jours. */
export function assertPeriod(from: string, to: string): number {
  if (from > to) {
    throw new BadRequestException('La date de début doit être avant la date de fin.');
  }
  const days = daysBetween(from, to);
  if (days > 366) {
    throw new BadRequestException('La période ne peut pas dépasser un an.');
  }
  return days;
}

/** Bornes des colonnes DATETIME (created_at) pour une période en jours. */
function bounds(from: string, to: string) {
  return { start: `${from} 00:00:00`, end: `${to} 23:59:59.999999` };
}

/**
 * Rapports sur une période. Lecture seule : aucun calcul n'est stocké,
 * tout est recalculé à partir des ventes, paiements, dépenses et du stock.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly paymentsService: PaymentsService,
    private readonly supplierPayments: SupplierPaymentsService,
  ) {}

  async build(from: string, to: string) {
    const days = assertPeriod(from, to);
    const { start, end } = bounds(from, to);

    const [result, cashByMethod, supplierPaid, topProducts, bySeller, expensesByCategory, chart, snapshot] =
      await Promise.all([
        this.result(from, to),
        this.cashByMethod(start, end),
        this.supplierPaid(start, end),
        this.topProducts(start, end),
        this.salesBySeller(start, end),
        this.expensesByCategory(from, to),
        this.series(from, to),
        this.snapshot(),
      ]);

    const expenses = result.expenses;
    const cashIn = cashByMethod.reduce((sum, m) => sum + m.total, 0);

    return {
      period: { from, to, days, granularity: chart.granularity },
      result,
      cash: {
        cashIn, // argent encaissé auprès des clients
        byMethod: cashByMethod,
        supplierPaid, // argent versé aux fournisseurs
        expenses, // argent sorti en dépenses
        balance: cashIn - supplierPaid - expenses,
      },
      topProducts,
      bySeller,
      expensesByCategory,
      series: chart.points,
      snapshot,
    };
  }

  /**
   * Résultat d'une période : ventes, coût d'achat, dépenses, bénéfice.
   * Seul endroit où le bénéfice est calculé (Rapports ET tableau de bord).
   */
  async result(from: string, to: string) {
    const { start, end } = bounds(from, to);
    const [sales, cogs, expenses] = await Promise.all([
      this.salesTotals(start, end),
      this.costOfGoodsSold(start, end),
      this.expensesTotal(from, to),
    ]);
    const grossMargin = sales.revenue - cogs;
    return {
      revenue: sales.revenue, // chiffre d'affaires (après remises)
      salesCount: sales.count,
      averageBasket: sales.count > 0 ? Math.round(sales.revenue / sales.count) : 0,
      discounts: sales.discounts,
      costOfGoodsSold: cogs,
      grossMargin,
      grossMarginRate: sales.revenue > 0 ? grossMargin / sales.revenue : null,
      expenses,
      netProfit: grossMargin - expenses,
    };
  }

  /**
   * Ventes et dépenses par jour (période ≤ 62 jours) ou par mois,
   * périodes vides incluses.
   */
  async series(from: string, to: string) {
    const granularity: 'day' | 'month' = daysBetween(from, to) <= 62 ? 'day' : 'month';
    const { start, end } = bounds(from, to);
    const fmt = granularity === 'day' ? '%Y-%m-%d' : '%Y-%m';
    const [salesRows, expenseRows] = await Promise.all([
      this.dataSource.query(
        `SELECT DATE_FORMAT(created_at, '${fmt}') AS bucket, SUM(total) AS total, COUNT(*) AS count
           FROM sales
          WHERE status = 'COMPLETED' AND created_at BETWEEN ? AND ?
          GROUP BY bucket`,
        [start, end],
      ) as Promise<Row[]>,
      this.dataSource.query(
        `SELECT DATE_FORMAT(expense_date, '${fmt}') AS bucket, SUM(amount) AS total
           FROM expenses
          WHERE status = 'VALID' AND expense_date BETWEEN ? AND ?
          GROUP BY bucket`,
        [from, to],
      ) as Promise<Row[]>,
    ]);
    const salesMap = new Map(salesRows.map((r) => [String(r.bucket), r]));
    const expenseMap = new Map(expenseRows.map((r) => [String(r.bucket), num(r.total)]));

    // Liste complète des jours (ou mois) de la période.
    const buckets: string[] = [];
    const cursor = new Date(`${from}T00:00:00Z`);
    const last = new Date(`${to}T00:00:00Z`);
    while (cursor <= last) {
      const key = granularity === 'day' ? cursor.toISOString().slice(0, 10) : cursor.toISOString().slice(0, 7);
      if (buckets.at(-1) !== key) buckets.push(key);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      granularity,
      points: buckets.map((bucket) => ({
        bucket,
        sales: num(salesMap.get(bucket)?.total),
        salesCount: num(salesMap.get(bucket)?.count),
        expenses: expenseMap.get(bucket) ?? 0,
      })),
    };
  }

  // ---------------------------------------------------------------------------

  private async salesTotals(start: string, end: string) {
    const [row] = (await this.dataSource.query(
      `SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS count, COALESCE(SUM(discount), 0) AS discounts
         FROM sales
        WHERE status = 'COMPLETED' AND created_at BETWEEN ? AND ?`,
      [start, end],
    )) as Row[];
    return { revenue: num(row?.revenue), count: num(row?.count), discounts: num(row?.discounts) };
  }

  /** Coût d'achat des produits vendus, au prix d'achat figé lors de chaque vente. */
  private async costOfGoodsSold(start: string, end: string): Promise<number> {
    const [row] = (await this.dataSource.query(
      `SELECT COALESCE(ROUND(SUM(si.quantity * si.unit_cost)), 0) AS cogs
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
        WHERE s.status = 'COMPLETED' AND s.created_at BETWEEN ? AND ?`,
      [start, end],
    )) as Row[];
    return num(row?.cogs);
  }

  private async expensesTotal(from: string, to: string): Promise<number> {
    const [row] = (await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
        WHERE status = 'VALID' AND expense_date BETWEEN ? AND ?`,
      [from, to],
    )) as Row[];
    return num(row?.total);
  }

  private async cashByMethod(start: string, end: string) {
    const rows = (await this.dataSource.query(
      `SELECT method, SUM(amount) AS total, COUNT(*) AS count
         FROM client_payments
        WHERE status = 'VALID' AND created_at BETWEEN ? AND ?
        GROUP BY method
        ORDER BY total DESC`,
      [start, end],
    )) as Row[];
    return rows.map((r) => ({ method: String(r.method), total: num(r.total), count: num(r.count) }));
  }

  private async supplierPaid(start: string, end: string): Promise<number> {
    const [row] = (await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
         FROM supplier_payments
        WHERE status = 'VALID' AND created_at BETWEEN ? AND ?`,
      [start, end],
    )) as Row[];
    return num(row?.total);
  }

  /** Les 10 produits qui rapportent le plus de chiffre d'affaires. */
  private async topProducts(start: string, end: string) {
    const rows = (await this.dataSource.query(
      `SELECT si.product_id AS id,
              MAX(si.product_name) AS name,
              MAX(si.unit) AS unit,
              SUM(si.quantity) AS quantity,
              SUM(si.line_total) AS revenue,
              ROUND(SUM(si.line_total - si.quantity * si.unit_cost)) AS margin
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
        WHERE s.status = 'COMPLETED' AND s.created_at BETWEEN ? AND ?
        GROUP BY si.product_id
        ORDER BY revenue DESC
        LIMIT 10`,
      [start, end],
    )) as Row[];
    return rows.map((r) => ({
      id: num(r.id),
      name: String(r.name),
      unit: String(r.unit),
      quantity: num(r.quantity),
      revenue: num(r.revenue),
      margin: num(r.margin),
    }));
  }

  private async salesBySeller(start: string, end: string) {
    const rows = (await this.dataSource.query(
      `SELECT u.id, u.name, COUNT(*) AS count, SUM(s.total) AS revenue
         FROM sales s
         JOIN users u ON u.id = s.user_id
        WHERE s.status = 'COMPLETED' AND s.created_at BETWEEN ? AND ?
        GROUP BY u.id, u.name
        ORDER BY revenue DESC`,
      [start, end],
    )) as Row[];
    return rows.map((r) => ({ id: num(r.id), name: String(r.name), count: num(r.count), revenue: num(r.revenue) }));
  }

  private async expensesByCategory(from: string, to: string) {
    const rows = (await this.dataSource.query(
      `SELECT c.id, c.name, SUM(e.amount) AS total
         FROM expenses e
         JOIN expense_categories c ON c.id = e.category_id
        WHERE e.status = 'VALID' AND e.expense_date BETWEEN ? AND ?
        GROUP BY c.id, c.name
        ORDER BY total DESC`,
      [from, to],
    )) as Row[];
    return rows.map((r) => ({ id: num(r.id), name: String(r.name), total: num(r.total) }));
  }

  /** Situation actuelle (indépendante de la période). */
  private async snapshot() {
    const [[stock], receivables, debts] = await Promise.all([
      this.dataSource.query(
        `SELECT COALESCE(ROUND(SUM(GREATEST(quantity, 0) * purchase_price)), 0) AS costValue,
                COALESCE(ROUND(SUM(GREATEST(quantity, 0) * sale_price)), 0) AS saleValue,
                SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END) AS outOfStock,
                SUM(CASE WHEN quantity > 0 AND min_stock > 0 AND quantity <= min_stock THEN 1 ELSE 0 END) AS lowStock,
                COUNT(*) AS activeProducts
           FROM products
          WHERE is_active = 1`,
      ) as Promise<Row[]>,
      this.paymentsService.receivables({ page: 1, limit: 1 }),
      this.supplierPayments.debts({ page: 1, limit: 1 }),
    ]);

    return {
      receivables: receivables.totalBalance + receivables.walkInBalance,
      supplierDebts: debts.totalBalance,
      stockCostValue: num(stock?.costValue), // ce que le stock m'a coûté
      stockSaleValue: num(stock?.saleValue), // ce qu'il rapporterait vendu au prix actuel
      activeProducts: num(stock?.activeProducts),
      outOfStock: num(stock?.outOfStock),
      lowStock: num(stock?.lowStock),
    };
  }
}
