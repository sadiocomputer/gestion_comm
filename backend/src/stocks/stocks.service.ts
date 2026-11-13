import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { roundQty } from '../common/utils/numeric';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import {
  ListMovementsQueryDto,
  StockAdjustDto,
  StockInDto,
  StockOutDto,
} from './dto/stock.dto';
import {
  MovementType,
  StockMovement,
} from './entities/stock-movement.entity';

export type MovementInput = {
  productId: number;
  type: MovementType;
  change: number; // signée : + entrée, - sortie
  unitCost?: number | null;
  supplierId?: number | null;
  reason?: string | null;
  userId: number;
  saleId?: number | null;
  /** Annulation de vente : autorisée même si le produit a été archivé depuis. */
  allowInactive?: boolean;
};

export type MovementResponse = {
  id: number;
  type: MovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number | null;
  reason: string | null;
  createdAt: Date;
  product: { id: number; name: string; unit: string };
  supplier: { id: number; name: string } | null;
  user: { id: number; name: string };
};

@Injectable()
export class StocksService {
  constructor(private readonly dataSource: DataSource) {}

  // ---------------------------------------------------------------------------
  // Opérations (chacune dans sa propre transaction)
  // ---------------------------------------------------------------------------

  async stockIn(
    productId: number,
    dto: StockInDto,
    userId: number,
    canSeeCost: boolean,
  ): Promise<MovementResponse> {
    const movement = await this.dataSource.transaction(async (manager) => {
      if (dto.supplierId) {
        await this.assertActiveSupplier(manager, dto.supplierId);
      }
      return this.applyMovement(manager, {
        productId,
        type: 'IN',
        change: dto.quantity,
        // Sans droit de voir les coûts, on ne peut pas non plus les saisir.
        unitCost: canSeeCost ? (dto.unitCost ?? null) : null,
        supplierId: dto.supplierId ?? null,
        reason: dto.reason ?? null,
        userId,
      });
    });
    return this.findMovement(movement.id, canSeeCost);
  }

  async stockOut(
    productId: number,
    dto: StockOutDto,
    userId: number,
    canSeeCost: boolean,
  ): Promise<MovementResponse> {
    const movement = await this.dataSource.transaction((manager) =>
      this.applyMovement(manager, {
        productId,
        type: 'OUT',
        change: -dto.quantity,
        reason: dto.reason,
        userId,
      }),
    );
    return this.findMovement(movement.id, canSeeCost);
  }

  async adjust(
    productId: number,
    dto: StockAdjustDto,
    userId: number,
    canSeeCost: boolean,
  ): Promise<MovementResponse> {
    const movement = await this.dataSource.transaction(async (manager) => {
      // Lecture verrouillée pour calculer l'écart sur la vraie valeur actuelle.
      const product = await this.lockProduct(manager, productId);
      const change = roundQty(dto.countedQuantity - product.quantity);
      if (change === 0) {
        throw new BadRequestException(
          'La quantité comptée est identique au stock actuel.',
        );
      }
      return this.applyMovement(manager, {
        productId,
        type: 'ADJUSTMENT',
        change,
        reason: dto.reason,
        userId,
      });
    });
    return this.findMovement(movement.id, canSeeCost);
  }

  async findMovement(id: number, canSeeCost: boolean) {
    const row = await this.dataSource.getRepository(StockMovement).findOne({
      where: { id },
      relations: { product: true, supplier: true, user: true },
    });
    if (!row) {
      throw new NotFoundException('Mouvement introuvable.');
    }
    return this.toResponse(row, canSeeCost);
  }

  /**
   * Cœur du module : applique UNE variation de stock.
   * Doit être appelée dans une transaction (le "manager" la représente) :
   * le module Ventes l'appellera dans la transaction de la vente.
   */
  async applyMovement(
    manager: EntityManager,
    input: MovementInput,
  ): Promise<StockMovement> {
    const product = await this.lockProduct(manager, input.productId);
    if (!product.isActive && !input.allowInactive) {
      throw new BadRequestException(`Le produit « ${product.name} » est archivé.`);
    }

    const before = product.quantity;
    const after = roundQty(before + input.change);
    if (after < 0) {
      throw new BadRequestException(
        `Stock insuffisant pour « ${product.name} » : ${before} ${product.unit} disponible(s).`,
      );
    }

    const productChanges: Partial<Product> = { quantity: after };
    // Une entrée avec un coût met à jour le prix d'achat (dernier prix connu).
    if (input.type === 'IN' && input.unitCost != null) {
      productChanges.purchasePrice = input.unitCost;
    }
    await manager.getRepository(Product).update(product.id, productChanges);

    const movements = manager.getRepository(StockMovement);
    return movements.save(
      movements.create({
        productId: product.id,
        type: input.type,
        quantityChange: roundQty(input.change),
        quantityBefore: before,
        quantityAfter: after,
        unitCost: input.unitCost ?? null,
        supplierId: input.supplierId ?? null,
        reason: input.reason ?? null,
        userId: input.userId,
        saleId: input.saleId ?? null,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Historique
  // ---------------------------------------------------------------------------

  async listMovements(query: ListMovementsQueryDto, canSeeCost: boolean) {
    const where: FindOptionsWhere<StockMovement> = {};
    if (query.productId) where.productId = query.productId;
    if (query.type) where.type = query.type;

    // Dates incluses, en UTC comme le reste de la base (la Guinée est à UTC+0).
    const start = query.from ? new Date(`${query.from}T00:00:00.000Z`) : null;
    const end = query.to ? new Date(`${query.to}T23:59:59.999Z`) : null;
    if (start && end) where.createdAt = Between(start, end);
    else if (start) where.createdAt = MoreThanOrEqual(start);
    else if (end) where.createdAt = LessThanOrEqual(end);

    const [rows, total] = await this.dataSource
      .getRepository(StockMovement)
      .findAndCount({
        where,
        relations: { product: true, supplier: true, user: true },
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });

    return {
      data: rows.map((row) => this.toResponse(row, canSeeCost)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /** Forme publique : n'expose que ce qui est utile, sans le coût si interdit. */
  toResponse(row: StockMovement, canSeeCost: boolean): MovementResponse {
    return {
      id: row.id,
      type: row.type,
      quantityChange: row.quantityChange,
      quantityBefore: row.quantityBefore,
      quantityAfter: row.quantityAfter,
      unitCost: canSeeCost ? row.unitCost : null,
      reason: row.reason,
      createdAt: row.createdAt,
      product: {
        id: row.product.id,
        name: row.product.name,
        unit: row.product.unit,
      },
      supplier: row.supplier
        ? { id: row.supplier.id, name: row.supplier.name }
        : null,
      user: { id: row.user.id, name: row.user.name },
    };
  }

  // ---------------------------------------------------------------------------
  // Outils internes
  // ---------------------------------------------------------------------------

  /**
   * SELECT ... FOR UPDATE : verrouille la ligne du produit jusqu'à la fin de
   * la transaction. Une seconde opération sur le même produit attend que la
   * première soit terminée, puis lit la quantité à jour.
   */
  private async lockProduct(
    manager: EntityManager,
    productId: number,
  ): Promise<Product> {
    const product = await manager.getRepository(Product).findOne({
      where: { id: productId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }
    return product;
  }

  private async assertActiveSupplier(manager: EntityManager, id: number) {
    const supplier = await manager.getRepository(Supplier).findOneBy({ id });
    if (!supplier) {
      throw new BadRequestException('Fournisseur introuvable.');
    }
    if (!supplier.isActive) {
      throw new BadRequestException(
        `Le fournisseur « ${supplier.name} » est archivé.`,
      );
    }
  }
}
