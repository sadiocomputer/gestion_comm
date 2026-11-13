import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isDuplicateEntry } from '../common/utils/database';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';

export type CategoryResponse = {
  id: number;
  name: string;
  description: string | null;
  productCount: number;
};

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
  ) {}

  async list(): Promise<CategoryResponse[]> {
    const categories = await this.categories.find({ order: { name: 'ASC' } });
    const rows = await this.products
      .createQueryBuilder('product')
      .select('product.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('product.categoryId IS NOT NULL')
      .groupBy('product.categoryId')
      .getRawMany<{ categoryId: number | string; count: number | string }>();
    const counts = new Map(rows.map((r) => [Number(r.categoryId), Number(r.count)]));

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      productCount: counts.get(c.id) ?? 0,
    }));
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    await this.assertNameAvailable(dto.name);
    try {
      return await this.categories.save(
        this.categories.create({
          name: dto.name,
          description: dto.description ?? null,
        }),
      );
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    if (dto.name !== undefined && dto.name !== category.name) {
      await this.assertNameAvailable(dto.name, id);
      category.name = dto.name;
    }
    if (dto.description !== undefined) category.description = dto.description;
    try {
      return await this.categories.save(category);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    const count = await this.products.countBy({ categoryId: id });
    if (count > 0) {
      throw new ConflictException(
        `Cette catégorie contient ${count} produit(s). Change-les de catégorie d'abord.`,
      );
    }
    await this.categories.remove(category);
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categories.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Catégorie introuvable.');
    }
    return category;
  }

  private async assertNameAvailable(name: string, exceptId?: number) {
    const existing = await this.categories.findOneBy({ name });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Une catégorie porte déjà ce nom.');
    }
  }

  private mapError(error: unknown) {
    return isDuplicateEntry(error)
      ? new ConflictException('Une catégorie porte déjà ce nom.')
      : error;
  }
}
