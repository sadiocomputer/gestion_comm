import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { SearchListQueryDto } from '../common/dto/search-list-query.dto';
import { escapeLike } from '../common/utils/database';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';

export type PaginatedSuppliers = {
  data: Supplier[];
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliers: Repository<Supplier>,
  ) {}

  async list(query: SearchListQueryDto): Promise<PaginatedSuppliers> {
    const qb = this.suppliers
      .createQueryBuilder('supplier')
      .orderBy('supplier.name', 'ASC')
      .addOrderBy('supplier.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.status !== 'all') {
      qb.andWhere('supplier.isActive = :isActive', {
        isActive: query.status === 'active',
      });
    }

    if (query.search) {
      const like = `%${escapeLike(query.search)}%`;
      const digits = query.search.replace(/\D/g, '');
      // Recherche dans le nom du fournisseur, le nom du contact et le téléphone.
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('supplier.name LIKE :like', { like })
            .orWhere('supplier.contactName LIKE :like', { like });
          if (digits.length >= 3) {
            where.orWhere('supplier.phone LIKE :phone', {
              phone: `%${digits}%`,
            });
          }
        }),
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.suppliers.findOneBy({ id });
    if (!supplier) {
      throw new NotFoundException('Fournisseur introuvable.');
    }
    return supplier;
  }

  create(dto: CreateSupplierDto): Promise<Supplier> {
    return this.suppliers.save(
      this.suppliers.create({
        name: dto.name,
        contactName: dto.contactName ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        notes: dto.notes ?? null,
        isActive: true,
      }),
    );
  }

  async update(id: number, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    // undefined = champ non envoyé (inchangé) ; null = champ effacé.
    if (dto.name !== undefined) supplier.name = dto.name;
    if (dto.contactName !== undefined) supplier.contactName = dto.contactName;
    if (dto.phone !== undefined) supplier.phone = dto.phone;
    if (dto.address !== undefined) supplier.address = dto.address;
    if (dto.notes !== undefined) supplier.notes = dto.notes;
    return this.suppliers.save(supplier);
  }

  async setActive(id: number, isActive: boolean): Promise<Supplier> {
    const supplier = await this.findOne(id);
    supplier.isActive = isActive;
    return this.suppliers.save(supplier);
  }
}
