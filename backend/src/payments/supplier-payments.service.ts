import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { StockMovement } from '../stocks/entities/stock-movement.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { BalanceListQueryDto, PaymentDto } from './dto/payment.dto';
import { SupplierPayment } from './entities/supplier-payment.entity';

/**
 * Achats d'un fournisseur = entrées de stock (IN) avec ce fournisseur ET un
 * coût unitaire. Dette = achats - paiements valides.
 */
const PURCHASES_SQL = `
  SELECT supplier_id, ROUND(SUM(quantity_change * unit_cost)) AS total
    FROM stock_movements
   WHERE type = 'IN' AND supplier_id IS NOT NULL AND unit_cost IS NOT NULL
   GROUP BY supplier_id`;

const PAYMENTS_SQL = `
  SELECT supplier_id, SUM(amount) AS total
    FROM supplier_payments
   WHERE status = 'VALID'
   GROUP BY supplier_id`;

@Injectable()
export class SupplierPaymentsService {
  constructor(private readonly dataSource: DataSource) {}

  /** Achats, payé et solde d'un fournisseur. */
  async balance(
    supplierId: number,
    manager: EntityManager = this.dataSource.manager,
  ) {
    const [purchases] = (await manager.query(
      `SELECT COALESCE(ROUND(SUM(quantity_change * unit_cost)), 0) AS total
         FROM stock_movements
        WHERE type = 'IN' AND supplier_id = ? AND unit_cost IS NOT NULL`,
      [supplierId],
    )) as { total: string | number }[];
    const [paid] = (await manager.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
         FROM supplier_payments
        WHERE status = 'VALID' AND supplier_id = ?`,
      [supplierId],
    )) as { total: string | number }[];

    const totalPurchases = Number(purchases?.total ?? 0);
    const totalPaid = Number(paid?.total ?? 0);
    return { totalPurchases, totalPaid, balance: totalPurchases - totalPaid };
  }

  async pay(supplierId: number, dto: PaymentDto, userId: number) {
    const id = await this.dataSource.transaction(async (manager) => {
      // Verrou sur le fournisseur : deux paiements simultanés sont traités
      // l'un après l'autre et ne peuvent pas dépasser la dette.
      const supplier = await manager.getRepository(Supplier).findOne({
        where: { id: supplierId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!supplier) {
        throw new NotFoundException('Fournisseur introuvable.');
      }

      const { balance } = await this.balance(supplierId, manager);
      if (balance <= 0) {
        throw new ConflictException("Aucune dette envers ce fournisseur.");
      }
      if (dto.amount > balance) {
        throw new BadRequestException(
          `Le montant dépasse la dette envers ce fournisseur (${balance} GNF).`,
        );
      }

      const repo = manager.getRepository(SupplierPayment);
      const payment = await repo.save(
        repo.create({
          supplierId,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference ?? null,
          notes: dto.notes ?? null,
          userId,
          status: 'VALID',
        }),
      );
      return payment.id;
    });
    return this.findOne(id);
  }

  async cancel(id: number, reason: string, userId: number) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SupplierPayment);
      const payment = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) {
        throw new NotFoundException('Paiement introuvable.');
      }
      if (payment.status !== 'VALID') {
        throw new ConflictException('Ce paiement est déjà annulé.');
      }
      await repo.update(id, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: userId,
        cancelReason: reason,
      });
    });
    return this.findOne(id);
  }

  async findOne(id: number) {
    const payment = await this.dataSource.getRepository(SupplierPayment).findOne({
      where: { id },
      relations: { supplier: true, user: true, cancelledBy: true },
    });
    if (!payment) {
      throw new NotFoundException('Paiement introuvable.');
    }
    return this.toResponse(payment);
  }

  /** Fournisseurs à qui l'on doit de l'argent. */
  async debts(query: BalanceListQueryDto) {
    const from = `
      FROM suppliers s
      LEFT JOIN (${PURCHASES_SQL}) p ON p.supplier_id = s.id
      LEFT JOIN (${PAYMENTS_SQL}) pay ON pay.supplier_id = s.id
     WHERE COALESCE(p.total, 0) - COALESCE(pay.total, 0) > 0`;

    const rows = (await this.dataSource.query(
      `SELECT s.id, s.name, s.phone,
              COALESCE(p.total, 0) AS purchases,
              COALESCE(pay.total, 0) AS paid,
              COALESCE(p.total, 0) - COALESCE(pay.total, 0) AS balance
       ${from}
       ORDER BY balance DESC
       LIMIT ? OFFSET ?`,
      [query.limit, (query.page - 1) * query.limit],
    )) as Record<string, string | number | null>[];

    const [totals] = (await this.dataSource.query(
      `SELECT COUNT(*) AS count,
              COALESCE(SUM(COALESCE(p.total, 0) - COALESCE(pay.total, 0)), 0) AS total
       ${from}`,
    )) as { count: string | number; total: string | number }[];

    return {
      data: rows.map((row) => ({
        supplier: { id: Number(row.id), name: String(row.name), phone: row.phone as string | null },
        purchases: Number(row.purchases),
        paid: Number(row.paid),
        balance: Number(row.balance),
      })),
      total: Number(totals?.count ?? 0),
      page: query.page,
      limit: query.limit,
      totalBalance: Number(totals?.total ?? 0),
    };
  }

  private async ensureSupplier(supplierId: number) {
    if (!(await this.dataSource.getRepository(Supplier).existsBy({ id: supplierId }))) {
      throw new NotFoundException('Fournisseur introuvable.');
    }
  }

  /**
   * Compte fournisseur : totaux seulement. L'historique se lit page par page
   * avec purchases() et payments().
   */
  async account(supplierId: number) {
    await this.ensureSupplier(supplierId);
    return this.balance(supplierId);
  }

  /** Achats (entrées de stock) d'un fournisseur, les plus récents d'abord. */
  async purchases(supplierId: number, query: BalanceListQueryDto) {
    await this.ensureSupplier(supplierId);
    const [rows, total] = await this.dataSource.getRepository(StockMovement).findAndCount({
      where: { supplierId, type: 'IN' },
      relations: { product: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      data: rows.map((m) => ({
        id: m.id,
        createdAt: m.createdAt,
        product: { id: m.product.id, name: m.product.name, unit: m.product.unit },
        quantity: m.quantityChange,
        unitCost: m.unitCost,
        total: m.unitCost != null ? Math.round(m.quantityChange * m.unitCost) : null,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /** Paiements faits à un fournisseur (annulés compris), les plus récents d'abord. */
  async payments(supplierId: number, query: BalanceListQueryDto) {
    await this.ensureSupplier(supplierId);
    const [rows, total] = await this.dataSource.getRepository(SupplierPayment).findAndCount({
      where: { supplierId },
      relations: { supplier: true, user: true, cancelledBy: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      data: rows.map((p) => this.toResponse(p)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  private toResponse(payment: SupplierPayment) {
    return {
      id: payment.id,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      status: payment.status,
      createdAt: payment.createdAt,
      cancelledAt: payment.cancelledAt,
      cancelReason: payment.cancelReason,
      supplier: { id: payment.supplier.id, name: payment.supplier.name },
      user: { id: payment.user.id, name: payment.user.name },
      cancelledBy: payment.cancelledBy
        ? { id: payment.cancelledBy.id, name: payment.cancelledBy.name }
        : null,
    };
  }
}
