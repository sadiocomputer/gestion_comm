import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { escapeLike } from '../common/utils/database';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';

export type PaginatedClients = {
  data: Client[];
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clients: Repository<Client>,
  ) {}

  async list(query: ListClientsQueryDto): Promise<PaginatedClients> {
    // QueryBuilder : construit la requête SQL morceau par morceau, ce qui
    // permet d'ajouter les filtres seulement quand ils sont demandés.
    const qb = this.clients
      .createQueryBuilder('client')
      .orderBy('client.name', 'ASC')
      .addOrderBy('client.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.status !== 'all') {
      qb.andWhere('client.isActive = :isActive', {
        isActive: query.status === 'active',
      });
    }

    if (query.search) {
      const like = `%${escapeLike(query.search)}%`;
      const digits = query.search.replace(/\D/g, '');
      // Brackets : (nom LIKE ... OR téléphone LIKE ...) AND is_active = ...
      qb.andWhere(
        new Brackets((where) => {
          where.where('client.name LIKE :like', { like });
          if (digits.length >= 3) {
            where.orWhere('client.phone LIKE :phone', { phone: `%${digits}%` });
          }
        }),
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.clients.findOneBy({ id });
    if (!client) {
      throw new NotFoundException('Client introuvable.');
    }
    return client;
  }

  create(dto: CreateClientDto): Promise<Client> {
    return this.clients.save(
      this.clients.create({
        name: dto.name,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        notes: dto.notes ?? null,
        isActive: true,
      }),
    );
  }

  async update(id: number, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    // undefined = champ non envoyé (inchangé) ; null = champ effacé.
    if (dto.name !== undefined) client.name = dto.name;
    if (dto.phone !== undefined) client.phone = dto.phone;
    if (dto.address !== undefined) client.address = dto.address;
    if (dto.notes !== undefined) client.notes = dto.notes;
    return this.clients.save(client);
  }

  async setActive(id: number, isActive: boolean): Promise<Client> {
    const client = await this.findOne(id);
    client.isActive = isActive;
    return this.clients.save(client);
  }
}
