import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentsService } from '../payments/payments.service';
import { SupplierPaymentsService } from '../payments/supplier-payments.service';
import { assertPeriod, ReportsService } from '../reports/reports.service';
import { RolesService } from '../roles/roles.service';

type Amount = { total: number; count: number };

type ChartPoint = {
  bucket: string; // "2026-11-12" (par jour) ou "2026-11" (par mois)
  sales: number | null; // null sans sales.read
  salesCount: number | null;
  expenses: number | null; // null sans expenses.read
};

/**
 * Chaque bloc vaut null si l'utilisateur n'a pas la permission correspondante :
 * le frontend n'affiche alors pas la carte.
 */
export type DashboardSummary = {
  period: { from: string; to: string; days: number };
  // --- Activité de la période choisie ---
  sales: Amount | null; // sales.read
  cash: number | null; // payments.read : argent réellement encaissé
  expenses: number | null; // expenses.read
  profit: {
    // dashboard.profit (Administrateur)
    revenue: number;
    costOfGoodsSold: number;
    expenses: number;
    netProfit: number;
  } | null;
  chart: {
    from: string;
    to: string;
    granularity: 'day' | 'month';
    points: ChartPoint[];
  } | null; // sales.read ou expenses.read
  // --- Situation actuelle (indépendante de la période) ---
  receivables: number | null; // payments.read
  supplierDebts: number | null; // supplier_payments.read
  stock: {
    // products.read
    activeProducts: number;
    lowStock: number;
    outOfStock: number;
    alerts: { id: number; name: string; quantity: number; minStock: number; unit: string }[];
  } | null;
};

/** "2026-11-12" en UTC (la base stocke en UTC ; la Guinée est à UTC+0). */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Date "AAAA-MM-JJ" décalée de n jours. */
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

/** Le graphique montre au moins 7 jours (sinon une seule barre pour « Aujourd'hui »). */
const MIN_CHART_DAYS = 7;

@Injectable()
export class DashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rolesService: RolesService,
    private readonly paymentsService: PaymentsService,
    private readonly supplierPayments: SupplierPaymentsService,
    private readonly reportsService: ReportsService,
  ) {}

  async summary(userId: number, from?: string, to?: string): Promise<DashboardSummary> {
    const today = isoDate(new Date());
    const end = to ?? today;
    const start = from ?? end;
    const days = assertPeriod(start, end);

    const can = await this.rolesService.getUserPermissionCodes(userId);
    const canSales = can.has('sales.read');
    const canExpenses = can.has('expenses.read');
    const canProfit = can.has('dashboard.profit');

    const chartFrom = days < MIN_CHART_DAYS ? addDays(end, -(MIN_CHART_DAYS - 1)) : start;

    // Les blocs autorisés sont calculés en parallèle.
    const [result, cash, receivables, supplierDebts, chart, stock] = await Promise.all([
      canSales || canExpenses || canProfit ? this.reportsService.result(start, end) : null,
      can.has('payments.read') ? this.cashBetween(start, end) : null,
      can.has('payments.read')
        ? this.paymentsService.receivables({ page: 1, limit: 1 }).then((r) => r.totalBalance + r.walkInBalance)
        : null,
      can.has('supplier_payments.read')
        ? this.supplierPayments.debts({ page: 1, limit: 1 }).then((r) => r.totalBalance)
        : null,
      canSales || canExpenses ? this.reportsService.series(chartFrom, end) : null,
      can.has('products.read') ? this.stockOverview() : null,
    ]);

    return {
      period: { from: start, to: end, days },
      sales: canSales && result ? { total: result.revenue, count: result.salesCount } : null,
      cash,
      expenses: canExpenses && result ? result.expenses : null,
      profit:
        canProfit && result
          ? {
              revenue: result.revenue,
              costOfGoodsSold: result.costOfGoodsSold,
              expenses: result.expenses,
              netProfit: result.netProfit,
            }
          : null,
      chart: chart
        ? {
            from: chartFrom,
            to: end,
            granularity: chart.granularity,
            // On ne renvoie que les séries autorisées.
            points: chart.points.map((p) => ({
              bucket: p.bucket,
              sales: canSales ? p.sales : null,
              salesCount: canSales ? p.salesCount : null,
              expenses: canExpenses ? p.expenses : null,
            })),
          }
        : null,
      receivables,
      supplierDebts,
      stock,
    };
  }

  /** Argent réellement encaissé (paiements valides) sur une période. */
  private async cashBetween(from: string, to: string): Promise<number> {
    const [row] = (await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
         FROM client_payments
        WHERE status = 'VALID' AND created_at BETWEEN ? AND ?`,
      [`${from} 00:00:00`, `${to} 23:59:59.999999`],
    )) as { total: string | number }[];
    return Number(row?.total ?? 0);
  }

  /** Produits actifs, ruptures, stocks bas + les 5 plus urgents. */
  private async stockOverview() {
    const [counts] = (await this.dataSource.query(
      `SELECT COUNT(*) AS active,
              SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END) AS outOfStock,
              SUM(CASE WHEN quantity > 0 AND min_stock > 0 AND quantity <= min_stock THEN 1 ELSE 0 END) AS lowStock
         FROM products
        WHERE is_active = 1`,
    )) as Record<string, string | number | null>[];

    // Ruptures d'abord, puis les stocks les plus proches de zéro par rapport au seuil.
    const alerts = (await this.dataSource.query(
      `SELECT id, name, quantity, min_stock AS minStock, unit
         FROM products
        WHERE is_active = 1 AND (quantity <= 0 OR (min_stock > 0 AND quantity <= min_stock))
        ORDER BY (quantity <= 0) DESC, quantity / NULLIF(min_stock, 0) ASC, name ASC
        LIMIT 5`,
    )) as { id: number; name: string; quantity: string; minStock: string; unit: string }[];

    return {
      activeProducts: Number(counts?.active ?? 0),
      lowStock: Number(counts?.lowStock ?? 0),
      outOfStock: Number(counts?.outOfStock ?? 0),
      alerts: alerts.map((a) => ({
        id: Number(a.id),
        name: a.name,
        quantity: Number(a.quantity),
        minStock: Number(a.minStock),
        unit: a.unit,
      })),
    };
  }
}
