import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { Sale } from '../sales/entities/sale.entity';
import {
  BalanceListQueryDto,
  ListPaymentsQueryDto,
  PaymentDto,
} from './dto/payment.dto';
import { ClientPayment } from './entities/client-payment.entity';
import type { PaymentMethod } from './payment.constants';

export type RecordPaymentInput = {
  saleId: number;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  userId: number;
};

export type PaymentResponse = {
  id: number;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  status: ClientPayment['status'];
  createdAt: Date;
  cancelledAt: Date | null;
  cancelReason: string | null;
  sale: { id: number; number: string | null };
  client: { id: number; name: string } | null;
  user: { id: number; name: string };
  cancelledBy: { id: number; name: string } | null;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly dataSource: DataSource) {}

  // ---------------------------------------------------------------------------
  // Encaissement
  // ---------------------------------------------------------------------------

  /**
   * Enregistre un paiement sur une vente, dans une transaction existante.
   * Réutilisé par SalesService pour le paiement saisi à la caisse.
   */
  async recordClientPayment(
    manager: EntityManager,
    input: RecordPaymentInput,
  ): Promise<ClientPayment> {
    const saleRepo = manager.getRepository(Sale);
    // Verrou : deux encaissements simultanés ne dépassent pas le total.
    const sale = await saleRepo.findOne({
      where: { id: input.saleId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!sale) {
      throw new NotFoundException('Vente introuvable.');
    }
    if (sale.status !== 'COMPLETED') {
      throw new ConflictException("Impossible d'encaisser une vente annulée.");
    }

    const remaining = sale.total - sale.amountPaid;
    if (remaining <= 0) {
      throw new ConflictException('Cette vente est déjà entièrement payée.');
    }
    if (input.amount > remaining) {
      throw new BadRequestException(
        `Le montant dépasse le reste à payer (${remaining} GNF).`,
      );
    }

    await saleRepo.update(sale.id, { amountPaid: sale.amountPaid + input.amount });

    const payments = manager.getRepository(ClientPayment);
    return payments.save(
      payments.create({
        saleId: sale.id,
        clientId: sale.clientId,
        amount: input.amount,
        method: input.method,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        userId: input.userId,
        status: 'VALID',
      }),
    );
  }

  async addPayment(
    saleId: number,
    dto: PaymentDto,
    userId: number,
  ): Promise<PaymentResponse> {
    const payment = await this.dataSource.transaction((manager) =>
      this.recordClientPayment(manager, { saleId, ...dto, userId }),
    );
    return this.findOne(payment.id);
  }

  /** Annulation (remboursement / erreur de saisie) : le reste à payer remonte. */
  async cancel(id: number, reason: string, userId: number): Promise<PaymentResponse> {
    await this.dataSource.transaction(async (manager) => {
      const payments = manager.getRepository(ClientPayment);
      const payment = await payments.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) {
        throw new NotFoundException('Paiement introuvable.');
      }
      if (payment.status !== 'VALID') {
        throw new ConflictException('Ce paiement est déjà annulé.');
      }

      const saleRepo = manager.getRepository(Sale);
      const sale = await saleRepo.findOneOrFail({
        where: { id: payment.saleId },
        lock: { mode: 'pessimistic_write' },
      });
      await saleRepo.update(sale.id, {
        amountPaid: Math.max(0, sale.amountPaid - payment.amount),
      });

      await payments.update(id, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: userId,
        cancelReason: reason,
      });
    });
    return this.findOne(id);
  }

  // ---------------------------------------------------------------------------
  // Consultation
  // ---------------------------------------------------------------------------

  async findOne(id: number): Promise<PaymentResponse> {
    const payment = await this.dataSource.getRepository(ClientPayment).findOne({
      where: { id },
      relations: { sale: true, client: true, user: true, cancelledBy: true },
    });
    if (!payment) {
      throw new NotFoundException('Paiement introuvable.');
    }
    return this.toResponse(payment);
  }

  /** Paiements d'une vente (utilisé par la fiche vente). */
  async listForSale(saleId: number): Promise<PaymentResponse[]> {
    const rows = await this.dataSource.getRepository(ClientPayment).find({
      where: { saleId },
      relations: { sale: true, client: true, user: true, cancelledBy: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async list(query: ListPaymentsQueryDto) {
    const qb = this.dataSource
      .getRepository(ClientPayment)
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.sale', 'sale')
      .leftJoinAndSelect('payment.client', 'client')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.cancelledBy', 'cancelledBy')
      .orderBy('payment.createdAt', 'DESC')
      .addOrderBy('payment.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.clientId) qb.andWhere('payment.clientId = :clientId', { clientId: query.clientId });
    if (query.method) qb.andWhere('payment.method = :method', { method: query.method });
    if (query.status) qb.andWhere('payment.status = :status', { status: query.status });
    if (query.from) qb.andWhere('payment.createdAt >= :from', { from: `${query.from} 00:00:00` });
    if (query.to) qb.andWhere('payment.createdAt <= :to', { to: `${query.to} 23:59:59.999999` });

    const [rows, total] = await qb.getManyAndCount();

    // Somme des paiements VALIDES correspondant aux mêmes filtres (sans pagination).
    const sumQb = this.dataSource
      .getRepository(ClientPayment)
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'sum')
      .where("payment.status = 'VALID'");
    if (query.clientId) sumQb.andWhere('payment.clientId = :clientId', { clientId: query.clientId });
    if (query.method) sumQb.andWhere('payment.method = :method', { method: query.method });
    if (query.from) sumQb.andWhere('payment.createdAt >= :from', { from: `${query.from} 00:00:00` });
    if (query.to) sumQb.andWhere('payment.createdAt <= :to', { to: `${query.to} 23:59:59.999999` });
    const sumRow = await sumQb.getRawOne<{ sum: string | number }>();

    return {
      data: rows.map((row) => this.toResponse(row)),
      total,
      page: query.page,
      limit: query.limit,
      validTotal: query.status === 'CANCELLED' ? 0 : Number(sumRow?.sum ?? 0),
    };
  }

  /** Clients qui doivent de l'argent, du plus gros solde au plus petit. */
  async receivables(query: BalanceListQueryDto) {
    const base = this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .where("sale.status = 'COMPLETED'")
      .andWhere('sale.amountPaid < sale.total');

    const rows = await base
      .clone()
      .innerJoin('sale.client', 'client')
      .select('client.id', 'clientId')
      .addSelect('client.name', 'name')
      .addSelect('client.phone', 'phone')
      .addSelect('SUM(sale.total - sale.amountPaid)', 'balance')
      .addSelect('COUNT(sale.id)', 'saleCount')
      .addSelect('MIN(sale.createdAt)', 'oldestSaleAt')
      .groupBy('client.id')
      .addGroupBy('client.name')
      .addGroupBy('client.phone')
      .orderBy('balance', 'DESC')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<Record<string, string | number | Date | null>>();

    const totals = await base
      .clone()
      .select('COUNT(DISTINCT sale.clientId)', 'clientCount')
      .addSelect(
        'COALESCE(SUM(CASE WHEN sale.clientId IS NOT NULL THEN sale.total - sale.amountPaid ELSE 0 END), 0)',
        'clientsBalance',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN sale.clientId IS NULL THEN sale.total - sale.amountPaid ELSE 0 END), 0)',
        'walkInBalance',
      )
      .getRawOne<Record<string, string | number>>();

    return {
      data: rows.map((row) => ({
        client: { id: Number(row.clientId), name: String(row.name), phone: row.phone as string | null },
        balance: Number(row.balance),
        saleCount: Number(row.saleCount),
        oldestSaleAt: row.oldestSaleAt,
      })),
      total: Number(totals?.clientCount ?? 0),
      page: query.page,
      limit: query.limit,
      totalBalance: Number(totals?.clientsBalance ?? 0),
      // Ventes non soldées sans client (à régulariser).
      walkInBalance: Number(totals?.walkInBalance ?? 0),
    };
  }

  /** Compte d'un client : totaux + ventes non soldées. */
  /**
   * Compte client. Les totaux portent sur TOUTES les ventes ; seule la liste
   * des factures à encaisser est découpée en pages (unpaidCount = leur nombre).
   */
  async clientAccount(clientId: number, query: BalanceListQueryDto) {
    const client = await this.dataSource.getRepository(Client).findOneBy({ id: clientId });
    if (!client) {
      throw new NotFoundException('Client introuvable.');
    }

    const totals = await this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.total), 0)', 'totalSales')
      .addSelect('COALESCE(SUM(sale.amountPaid), 0)', 'totalPaid')
      .where('sale.clientId = :clientId', { clientId })
      .andWhere("sale.status = 'COMPLETED'")
      .getRawOne<{ totalSales: string | number; totalPaid: string | number }>();

    // Les plus anciennes d'abord : ce sont celles à relancer en priorité.
    const [unpaid, unpaidCount] = await this.dataSource.getRepository(Sale).createQueryBuilder('sale')
      .where('sale.clientId = :clientId', { clientId })
      .andWhere("sale.status = 'COMPLETED'")
      .andWhere('sale.amountPaid < sale.total')
      .orderBy('sale.createdAt', 'ASC')
      .addOrderBy('sale.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    const totalSales = Number(totals?.totalSales ?? 0);
    const totalPaid = Number(totals?.totalPaid ?? 0);
    return {
      totalSales,
      totalPaid,
      balance: totalSales - totalPaid,
      unpaidSales: unpaid.map((sale) => ({
        id: sale.id,
        number: sale.number,
        createdAt: sale.createdAt,
        total: sale.total,
        amountPaid: sale.amountPaid,
        balance: sale.total - sale.amountPaid,
      })),
      unpaidCount,
      page: query.page,
      limit: query.limit,
    };
  }

  // ---------------------------------------------------------------------------

  private toResponse(payment: ClientPayment): PaymentResponse {
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
      sale: { id: payment.sale.id, number: payment.sale.number },
      client: payment.client ? { id: payment.client.id, name: payment.client.name } : null,
      user: { id: payment.user.id, name: payment.user.name },
      cancelledBy: payment.cancelledBy
        ? { id: payment.cancelledBy.id, name: payment.cancelledBy.name }
        : null,
    };
  }
}
