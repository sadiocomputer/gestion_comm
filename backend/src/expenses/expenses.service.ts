import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { isDuplicateEntry } from '../common/utils/database';
import {
  CreateExpenseDto,
  ExpenseCategoryDto,
  ListExpensesQueryDto,
} from './dto/expense.dto';
import { ExpenseCategory } from './entities/expense-category.entity';
import { Expense } from './entities/expense.entity';

/** Catégories créées par "npm run seed" si elles manquent. */
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Loyer',
  'Électricité',
  'Eau',
  'Salaires',
  'Transport',
  'Carburant',
  'Téléphone et internet',
  'Fournitures',
  'Réparations',
  'Impôts et taxes',
  'Autre',
];

/** "AAAA-MM-JJ" du jour (la Guinée est à UTC+0, comme la base). */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class ExpensesService {
  constructor(private readonly dataSource: DataSource) {}

  // ---------------------------------------------------------------------------
  // Dépenses
  // ---------------------------------------------------------------------------

  async create(dto: CreateExpenseDto, userId: number) {
    const expenseDate = dto.expenseDate ?? todayISO();
    if (expenseDate > todayISO()) {
      throw new BadRequestException('La date de la dépense ne peut pas être dans le futur.');
    }
    if (!(await this.dataSource.getRepository(ExpenseCategory).existsBy({ id: dto.categoryId }))) {
      throw new BadRequestException('Catégorie introuvable.');
    }

    const repo = this.dataSource.getRepository(Expense);
    const expense = await repo.save(
      repo.create({
        categoryId: dto.categoryId,
        amount: dto.amount,
        description: dto.description,
        expenseDate,
        method: dto.method ?? 'CASH',
        reference: dto.reference ?? null,
        userId,
        status: 'VALID',
      }),
    );
    return this.findOne(expense.id);
  }

  async cancel(id: number, reason: string, userId: number) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Expense);
      const expense = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!expense) {
        throw new NotFoundException('Dépense introuvable.');
      }
      if (expense.status !== 'VALID') {
        throw new ConflictException('Cette dépense est déjà annulée.');
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
    const expense = await this.dataSource.getRepository(Expense).findOne({
      where: { id },
      relations: { category: true, user: true, cancelledBy: true },
    });
    if (!expense) {
      throw new NotFoundException('Dépense introuvable.');
    }
    return this.toResponse(expense);
  }

  /** Liste paginée + total de la période + répartition par catégorie. */
  async list(query: ListExpensesQueryDto) {
    const filtered = (qb: SelectQueryBuilder<Expense>) => {
      if (query.from) qb.andWhere('expense.expenseDate >= :from', { from: query.from });
      if (query.to) qb.andWhere('expense.expenseDate <= :to', { to: query.to });
      if (query.categoryId) qb.andWhere('expense.categoryId = :categoryId', { categoryId: query.categoryId });
      return qb;
    };
    const repo = this.dataSource.getRepository(Expense);

    const listQb = filtered(
      repo
        .createQueryBuilder('expense')
        .leftJoinAndSelect('expense.category', 'category')
        .leftJoinAndSelect('expense.user', 'user')
        .leftJoinAndSelect('expense.cancelledBy', 'cancelledBy')
        .orderBy('expense.expenseDate', 'DESC')
        .addOrderBy('expense.id', 'DESC')
        .skip((query.page - 1) * query.limit)
        .take(query.limit),
    );
    if (query.status) listQb.andWhere('expense.status = :status', { status: query.status });
    const [rows, total] = await listQb.getManyAndCount();

    // Totaux : uniquement les dépenses VALIDES de la période.
    const byCategory = await filtered(
      repo
        .createQueryBuilder('expense')
        .innerJoin('expense.category', 'category')
        .select('category.id', 'id')
        .addSelect('category.name', 'name')
        .addSelect('SUM(expense.amount)', 'total')
        .where("expense.status = 'VALID'")
        .groupBy('category.id')
        .addGroupBy('category.name')
        .orderBy('total', 'DESC'),
    ).getRawMany<{ id: number | string; name: string; total: string | number }>();

    const categories = byCategory.map((c) => ({ id: Number(c.id), name: c.name, total: Number(c.total) }));
    return {
      data: rows.map((row) => this.toResponse(row)),
      total,
      page: query.page,
      limit: query.limit,
      validTotal: categories.reduce((sum, c) => sum + c.total, 0),
      byCategory: categories,
    };
  }

  // ---------------------------------------------------------------------------
  // Catégories
  // ---------------------------------------------------------------------------

  async listCategories() {
    const categories = await this.dataSource
      .getRepository(ExpenseCategory)
      .find({ order: { name: 'ASC' } });
    const rows = (await this.dataSource.query(
      'SELECT category_id AS id, COUNT(*) AS count FROM expenses GROUP BY category_id',
    )) as { id: number | string; count: number | string }[];
    const counts = new Map(rows.map((r) => [Number(r.id), Number(r.count)]));
    return categories.map((c) => ({ id: c.id, name: c.name, expenseCount: counts.get(c.id) ?? 0 }));
  }

  async createCategory(dto: ExpenseCategoryDto) {
    const repo = this.dataSource.getRepository(ExpenseCategory);
    await this.assertCategoryNameAvailable(dto.name);
    try {
      return await repo.save(repo.create({ name: dto.name }));
    } catch (error) {
      throw this.mapCategoryError(error);
    }
  }

  async renameCategory(id: number, dto: ExpenseCategoryDto) {
    const repo = this.dataSource.getRepository(ExpenseCategory);
    const category = await repo.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Catégorie introuvable.');
    }
    await this.assertCategoryNameAvailable(dto.name, id);
    try {
      await repo.update(id, { name: dto.name });
    } catch (error) {
      throw this.mapCategoryError(error);
    }
    return repo.findOneByOrFail({ id });
  }

  async removeCategory(id: number) {
    const repo = this.dataSource.getRepository(ExpenseCategory);
    const category = await repo.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Catégorie introuvable.');
    }
    const count = await this.dataSource.getRepository(Expense).countBy({ categoryId: id });
    if (count > 0) {
      throw new ConflictException(
        `Cette catégorie contient ${count} dépense(s) : elle ne peut pas être supprimée.`,
      );
    }
    await repo.remove(category);
  }

  /** Seed : ajoute les catégories par défaut manquantes. */
  async seedDefaults(): Promise<number> {
    const repo = this.dataSource.getRepository(ExpenseCategory);
    const existing = new Set((await repo.find()).map((c) => c.name.toLowerCase()));
    let added = 0;
    for (const name of DEFAULT_EXPENSE_CATEGORIES) {
      if (existing.has(name.toLowerCase())) continue;
      await repo.save(repo.create({ name }));
      added++;
    }
    return added;
  }

  // ---------------------------------------------------------------------------

  private async assertCategoryNameAvailable(name: string, exceptId?: number) {
    const existing = await this.dataSource.getRepository(ExpenseCategory).findOneBy({ name });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Une catégorie porte déjà ce nom.');
    }
  }

  private mapCategoryError(error: unknown) {
    return isDuplicateEntry(error) ? new ConflictException('Une catégorie porte déjà ce nom.') : error;
  }

  private toResponse(expense: Expense) {
    return {
      id: expense.id,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate,
      method: expense.method,
      reference: expense.reference,
      status: expense.status,
      createdAt: expense.createdAt,
      cancelledAt: expense.cancelledAt,
      cancelReason: expense.cancelReason,
      category: { id: expense.category.id, name: expense.category.name },
      user: { id: expense.user.id, name: expense.user.name },
      cancelledBy: expense.cancelledBy ? { id: expense.cancelledBy.id, name: expense.cancelledBy.name } : null,
    };
  }
}
