import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import { escapeLike, isDuplicateEntry } from '../common/utils/database';
import { StocksService } from '../stocks/stocks.service';
import {
  CreateProductDto,
  ListProductsQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';

/** Produit renvoyé au frontend : prix d'achat masqué (null) si interdit. */
export type ProductResponse = Omit<Product, 'purchasePrice'> & {
  purchasePrice: number | null;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly stocksService: StocksService,
  ) {}

  async list(query: ListProductsQueryDto, canSeeCost: boolean) {
    const qb = this.products
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.name', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.status !== 'all') {
      qb.andWhere('product.isActive = :isActive', {
        isActive: query.status === 'active',
      });
    }
    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.lowStock) {
      // Seuil défini ET stock arrivé au seuil ou en dessous.
      qb.andWhere('product.minStock > 0 AND product.quantity <= product.minStock');
    }
    if (query.search) {
      const like = `%${escapeLike(query.search)}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('product.name LIKE :like', { like })
            .orWhere('product.sku LIKE :like', { like });
        }),
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((p) => this.toResponse(p, canSeeCost)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findOne(id: number, canSeeCost: boolean): Promise<ProductResponse> {
    return this.toResponse(await this.getOrFail(id), canSeeCost);
  }

  /** Création + éventuel stock initial, dans une seule transaction. */
  async create(
    dto: CreateProductDto,
    userId: number,
    canSeeCost: boolean,
  ): Promise<ProductResponse> {
    const purchasePrice = canSeeCost ? (dto.purchasePrice ?? 0) : 0;
    try {
      const productId = await this.dataSource.transaction(async (manager) => {
        await this.assertCategoryExists(manager, dto.categoryId);
        await this.assertSkuAvailable(manager, dto.sku);

        const repo = manager.getRepository(Product);
        const product = await repo.save(
          repo.create({
            name: dto.name,
            sku: dto.sku ?? null,
            categoryId: dto.categoryId ?? null,
            unit: dto.unit || 'pièce',
            purchasePrice,
            salePrice: dto.salePrice,
            quantity: 0,
            minStock: dto.minStock ?? 0,
            isActive: true,
          }),
        );

        if (dto.initialQuantity && dto.initialQuantity > 0) {
          await this.stocksService.applyMovement(manager, {
            productId: product.id,
            type: 'IN',
            change: dto.initialQuantity,
            unitCost: canSeeCost ? purchasePrice : null,
            reason: 'Stock initial',
            userId,
          });
        }
        return product.id;
      });
      return this.findOne(productId, canSeeCost);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async update(
    id: number,
    dto: UpdateProductDto,
    canSeeCost: boolean,
  ): Promise<ProductResponse> {
    const product = await this.getOrFail(id);
    // update() avec les seules colonnes modifiées (pas save()) : avec save(),
    // la relation "category" chargée l'emporterait sur "categoryId".
    const changes: Partial<Product> = {};

    if (dto.categoryId !== undefined) {
      await this.assertCategoryExists(this.dataSource.manager, dto.categoryId);
      changes.categoryId = dto.categoryId;
    }
    if (dto.sku !== undefined && dto.sku !== product.sku) {
      await this.assertSkuAvailable(this.dataSource.manager, dto.sku, id);
      changes.sku = dto.sku;
    }
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.unit !== undefined) changes.unit = dto.unit;
    if (dto.salePrice !== undefined) changes.salePrice = dto.salePrice;
    if (dto.minStock !== undefined) changes.minStock = dto.minStock;
    // On ne modifie pas un prix qu'on n'a pas le droit de voir.
    if (dto.purchasePrice !== undefined && canSeeCost) {
      changes.purchasePrice = dto.purchasePrice;
    }

    if (Object.keys(changes).length > 0) {
      try {
        await this.products.update(id, changes);
      } catch (error) {
        throw this.mapError(error);
      }
    }
    return this.findOne(id, canSeeCost);
  }

  async setActive(id: number, isActive: boolean, canSeeCost: boolean) {
    await this.getOrFail(id);
    await this.products.update(id, { isActive });
    return this.findOne(id, canSeeCost);
  }

  // ---------------------------------------------------------------------------

  private async getOrFail(id: number): Promise<Product> {
    const product = await this.products.findOne({
      where: { id },
      relations: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }
    return product;
  }

  private async assertCategoryExists(
    manager: EntityManager,
    categoryId: number | null | undefined,
  ) {
    if (categoryId == null) return;
    if (!(await manager.getRepository(Category).existsBy({ id: categoryId }))) {
      throw new BadRequestException('Catégorie introuvable.');
    }
  }

  private async assertSkuAvailable(
    manager: EntityManager,
    sku: string | null | undefined,
    exceptId?: number,
  ) {
    if (!sku) return;
    const existing = await manager.getRepository(Product).findOneBy({ sku });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(
        `Cette référence est déjà utilisée par « ${existing.name} ».`,
      );
    }
  }

  private mapError(error: unknown) {
    return isDuplicateEntry(error)
      ? new ConflictException('Cette référence est déjà utilisée.')
      : error;
  }

  private toResponse(product: Product, canSeeCost: boolean): ProductResponse {
    return {
      ...product,
      purchasePrice: canSeeCost ? product.purchasePrice : null,
    };
  }
}
