import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isDuplicateEntry } from '../common/utils/database';
import { UnitDto } from './dto/unit.dto';
import { Product } from './entities/product.entity';
import { Unit } from './entities/unit.entity';

/** Unités proposées par défaut (créées par "npm run seed"). */
export const DEFAULT_UNITS = [
  'pièce',
  'carton',
  'paquet',
  'sachet',
  'boîte',
  'barre',
  'bouteille',
  'litre',
  'ml',
  'kg',
  'g',
  'sac',
  'mètre',
  'cm',
  'douzaine',
];

export type UnitResponse = { id: number; name: string; productCount: number };

@Injectable()
export class UnitsService {
  constructor(private readonly dataSource: DataSource) {}

  async list(): Promise<UnitResponse[]> {
    const units = await this.dataSource
      .getRepository(Unit)
      .find({ order: { name: 'ASC' } });

    // Nombre de produits par nom d'unité (comparaison insensible à la casse
    // grâce à la collation utf8mb4_unicode_ci).
    const rows = await this.dataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .select('LOWER(product.unit)', 'unit')
      .addSelect('COUNT(*)', 'count')
      .groupBy('LOWER(product.unit)')
      .getRawMany<{ unit: string; count: string | number }>();
    const counts = new Map(rows.map((r) => [r.unit, Number(r.count)]));

    return units.map((u) => ({
      id: u.id,
      name: u.name,
      productCount: counts.get(u.name.toLowerCase()) ?? 0,
    }));
  }

  async create(dto: UnitDto): Promise<Unit> {
    const repo = this.dataSource.getRepository(Unit);
    await this.assertNameAvailable(dto.name);
    try {
      return await repo.save(repo.create({ name: dto.name }));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /** Renomme l'unité ET les produits qui l'utilisent (même transaction). */
  async rename(id: number, dto: UnitDto): Promise<Unit> {
    const unit = await this.findOne(id);
    if (unit.name === dto.name) return unit;
    await this.assertNameAvailable(dto.name, id);

    const oldName = unit.name;
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(Unit).update(id, { name: dto.name });
        await manager
          .getRepository(Product)
          .update({ unit: oldName }, { unit: dto.name });
      });
    } catch (error) {
      throw this.mapError(error);
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const unit = await this.findOne(id);
    const count = await this.dataSource
      .getRepository(Product)
      .countBy({ unit: unit.name });
    if (count > 0) {
      throw new ConflictException(
        `Cette unité est utilisée par ${count} produit(s). Changez-leur d'unité d'abord.`,
      );
    }
    await this.dataSource.getRepository(Unit).remove(unit);
  }

  /**
   * Seed : ajoute les unités par défaut et celles déjà utilisées par les
   * produits. Ne crée que ce qui manque. Renvoie le nombre d'unités ajoutées.
   */
  async seedDefaults(): Promise<number> {
    const repo = this.dataSource.getRepository(Unit);
    const existing = new Set(
      (await repo.find()).map((u) => u.name.toLowerCase()),
    );
    const usedByProducts = (
      await this.dataSource
        .getRepository(Product)
        .createQueryBuilder('product')
        .select('DISTINCT product.unit', 'unit')
        .getRawMany<{ unit: string }>()
    ).map((r) => r.unit);

    let added = 0;
    for (const name of [...DEFAULT_UNITS, ...usedByProducts]) {
      const key = name.trim().toLowerCase();
      if (!key || existing.has(key)) continue;
      await repo.save(repo.create({ name: name.trim() }));
      existing.add(key);
      added++;
    }
    return added;
  }

  private async findOne(id: number): Promise<Unit> {
    const unit = await this.dataSource.getRepository(Unit).findOneBy({ id });
    if (!unit) {
      throw new NotFoundException('Unité introuvable.');
    }
    return unit;
  }

  private async assertNameAvailable(name: string, exceptId?: number) {
    const existing = await this.dataSource
      .getRepository(Unit)
      .findOneBy({ name });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Cette unité existe déjà.');
    }
  }

  private mapError(error: unknown) {
    return isDuplicateEntry(error)
      ? new ConflictException('Cette unité existe déjà.')
      : error;
  }
}
