import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brackets, DataSource, EntityManager } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { escapeLike } from '../common/utils/database';
import { PaymentResponse, PaymentsService } from '../payments/payments.service';
import { Product } from '../products/entities/product.entity';
import { StocksService } from '../stocks/stocks.service';
import { CreateSaleDto, ListSalesQueryDto, PaymentState } from './dto/sale.dto';
import { SaleItem } from './entities/sale-item.entity';
import { Sale, SaleStatus } from './entities/sale.entity';

/** Qui consulte : détermine ce qu'il a le droit de voir. */
export type Viewer = {
  id: number;
  permissions: Set<string>;
};

type PersonRef = { id: number; name: string };

export type SaleSummary = {
  id: number;
  number: string;
  status: SaleStatus;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentState;
  createdAt: Date;
  client: (PersonRef & { phone: string | null }) | null;
  user: PersonRef;
};

export type SaleDetail = SaleSummary & {
  notes: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  cancelledBy: PersonRef | null;
  items: {
    id: number;
    productId: number;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    unitCost: number | null;
  }[];
  payments: PaymentResponse[];
};

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly stocksService: StocksService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Création
  // ---------------------------------------------------------------------------

  async create(dto: CreateSaleDto, viewer: Viewer): Promise<SaleDetail> {
    const canDiscount = viewer.permissions.has('sales.discount');
    const discount = dto.discount ?? 0;

    const productIds = dto.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException(
        'Un même produit apparaît sur deux lignes : modifie plutôt la quantité.',
      );
    }
    if (discount > 0 && !canDiscount) {
      throw new ForbiddenException("Tu n'as pas le droit d'accorder une remise.");
    }
    const payment = dto.payment;
    if (payment && payment.amount > 0 && !viewer.permissions.has('payments.create')) {
      throw new ForbiddenException(
        "Tu n'as pas le droit d'encaisser : enregistre la vente sans paiement.",
      );
    }

    const saleId = await this.dataSource.transaction(async (manager) => {
      if (dto.clientId) {
        await this.assertActiveClient(manager, dto.clientId);
      }

      // 1. La vente d'abord, pour obtenir son id (donc son numéro).
      const saleRepo = manager.getRepository(Sale);
      const sale = await saleRepo.save(
        saleRepo.create({
          number: null,
          clientId: dto.clientId ?? null,
          userId: viewer.id,
          status: 'COMPLETED',
          subtotal: 0,
          discount: 0,
          total: 0,
          notes: dto.notes ?? null,
        }),
      );
      const number = `F${new Date().getFullYear()}-${String(sale.id).padStart(6, '0')}`;

      // 2. Les lignes, triées par produit : deux ventes simultanées
      //    verrouillent les produits dans le même ordre (pas d'interblocage).
      const lines = [...dto.items].sort((a, b) => a.productId - b.productId);
      const itemRepo = manager.getRepository(SaleItem);
      const items: SaleItem[] = [];
      let subtotal = 0;

      for (const line of lines) {
        const product = await manager.getRepository(Product).findOne({
          where: { id: line.productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) {
          throw new BadRequestException(`Produit n°${line.productId} introuvable.`);
        }

        // Le prix envoyé par le navigateur n'est accepté qu'avec la permission.
        const unitPrice =
          canDiscount && line.unitPrice !== undefined
            ? line.unitPrice
            : product.salePrice;
        const lineTotal = Math.round(line.quantity * unitPrice);

        // Baisse du stock (refusée si insuffisant ou produit archivé).
        await this.stocksService.applyMovement(manager, {
          productId: product.id,
          type: 'SALE',
          change: -line.quantity,
          reason: `Vente ${number}`,
          userId: viewer.id,
          saleId: sale.id,
        });

        items.push(
          itemRepo.create({
            saleId: sale.id,
            productId: product.id,
            productName: product.name,
            unit: product.unit,
            quantity: line.quantity,
            unitPrice,
            unitCost: product.purchasePrice,
            lineTotal,
          }),
        );
        subtotal += lineTotal;
      }
      await itemRepo.save(items);

      // 3. Totaux calculés par le serveur.
      if (discount > subtotal) {
        throw new BadRequestException('La remise dépasse le montant de la vente.');
      }
      const total = subtotal - discount;
      await saleRepo.update(sale.id, { number, subtotal, discount, total });

      // 4. Paiement reçu à la caisse (même transaction).
      if (payment && payment.amount > 0) {
        if (payment.amount > total) {
          throw new BadRequestException(
            `Le montant reçu dépasse le total (${total} GNF). Rends la monnaie et saisis le total.`,
          );
        }
        if (payment.amount < total && !dto.clientId) {
          throw new BadRequestException(
            'Vente à crédit : choisis un client pour pouvoir suivre ce qu’il doit.',
          );
        }
        await this.paymentsService.recordClientPayment(manager, {
          saleId: sale.id,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference ?? null,
          userId: viewer.id,
        });
      }
      return sale.id;
    });

    return this.findOne(saleId, viewer);
  }

  // ---------------------------------------------------------------------------
  // Annulation
  // ---------------------------------------------------------------------------

  async cancel(id: number, reason: string, viewer: Viewer): Promise<SaleDetail> {
    await this.dataSource.transaction(async (manager) => {
      const saleRepo = manager.getRepository(Sale);
      // Verrou : deux annulations simultanées ne restituent pas deux fois.
      const sale = await saleRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!sale) {
        throw new NotFoundException('Vente introuvable.');
      }
      if (sale.status !== 'COMPLETED') {
        throw new ConflictException('Cette vente est déjà annulée.');
      }
      if (sale.amountPaid > 0) {
        throw new ConflictException(
          "Cette vente a des paiements : annule-les d'abord (remboursement), puis la vente.",
        );
      }

      const items = await manager
        .getRepository(SaleItem)
        .find({ where: { saleId: id }, order: { productId: 'ASC' } });

      for (const item of items) {
        await this.stocksService.applyMovement(manager, {
          productId: item.productId,
          type: 'SALE_CANCEL',
          change: item.quantity,
          reason: `Annulation ${sale.number}`,
          userId: viewer.id,
          saleId: sale.id,
          allowInactive: true,
        });
      }

      await saleRepo.update(id, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: viewer.id,
        cancelReason: reason,
      });
    });

    return this.findOne(id, viewer);
  }

  // ---------------------------------------------------------------------------
  // Consultation
  // ---------------------------------------------------------------------------

  async list(query: ListSalesQueryDto, viewer: Viewer) {
    const qb = this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('sale.user', 'user')
      .orderBy('sale.createdAt', 'DESC')
      .addOrderBy('sale.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    // Sans sales.read : uniquement ses propres ventes.
    if (!viewer.permissions.has('sales.read')) {
      qb.andWhere('sale.userId = :viewerId', { viewerId: viewer.id });
    }
    if (query.status) {
      qb.andWhere('sale.status = :status', { status: query.status });
    }
    if (query.clientId) {
      qb.andWhere('sale.clientId = :clientId', { clientId: query.clientId });
    }
    if (query.paymentStatus) {
      qb.andWhere("sale.status = 'COMPLETED'");
      if (query.paymentStatus === 'UNPAID') {
        qb.andWhere('sale.amountPaid = 0 AND sale.total > 0');
      } else if (query.paymentStatus === 'PARTIAL') {
        qb.andWhere('sale.amountPaid > 0 AND sale.amountPaid < sale.total');
      } else {
        qb.andWhere('sale.amountPaid >= sale.total');
      }
    }
    if (query.from) {
      qb.andWhere('sale.createdAt >= :from', { from: `${query.from} 00:00:00` });
    }
    if (query.to) {
      qb.andWhere('sale.createdAt <= :to', { to: `${query.to} 23:59:59.999999` });
    }
    if (query.search) {
      const like = `%${escapeLike(query.search)}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('sale.number LIKE :like', { like })
            .orWhere('client.name LIKE :like', { like });
        }),
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((sale) => this.toSummary(sale)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findOne(id: number, viewer: Viewer): Promise<SaleDetail> {
    const sale = await this.dataSource.getRepository(Sale).findOne({
      where: { id },
      relations: { client: true, user: true, cancelledBy: true, items: true },
      order: { items: { id: 'ASC' } },
    });
    // Même message si elle n'existe pas ou n'est pas la sienne : on ne révèle rien.
    if (
      !sale ||
      (!viewer.permissions.has('sales.read') && sale.userId !== viewer.id)
    ) {
      throw new NotFoundException('Vente introuvable.');
    }

    const canSeeCost = viewer.permissions.has('products.read_cost');
    return {
      ...this.toSummary(sale),
      notes: sale.notes,
      cancelledAt: sale.cancelledAt,
      cancelReason: sale.cancelReason,
      cancelledBy: sale.cancelledBy
        ? { id: sale.cancelledBy.id, name: sale.cancelledBy.name }
        : null,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        unitCost: canSeeCost ? item.unitCost : null,
      })),
      payments: await this.paymentsService.listForSale(sale.id),
    };
  }

  // ---------------------------------------------------------------------------

  private async assertActiveClient(manager: EntityManager, id: number) {
    const client = await manager.getRepository(Client).findOneBy({ id });
    if (!client) {
      throw new BadRequestException('Client introuvable.');
    }
    if (!client.isActive) {
      throw new BadRequestException(`Le client « ${client.name} » est archivé.`);
    }
  }

  private toSummary(sale: Sale): SaleSummary {
    return {
      id: sale.id,
      number: sale.number ?? '',
      status: sale.status,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      amountPaid: sale.amountPaid,
      balance: sale.status === 'COMPLETED' ? sale.total - sale.amountPaid : 0,
      paymentStatus:
        sale.amountPaid >= sale.total
          ? 'PAID'
          : sale.amountPaid > 0
            ? 'PARTIAL'
            : 'UNPAID',
      createdAt: sale.createdAt,
      client: sale.client
        ? { id: sale.client.id, name: sale.client.name, phone: sale.client.phone }
        : null,
      user: { id: sale.user.id, name: sale.user.name },
    };
  }
}
