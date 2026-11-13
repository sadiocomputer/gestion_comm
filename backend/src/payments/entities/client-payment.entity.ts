import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { numericTransformer } from '../../common/utils/numeric';
import { Sale } from '../../sales/entities/sale.entity';
import { User } from '../../users/entities/user.entity';
import type { PaymentMethod, PaymentStatus } from '../payment.constants';

/** Encaissement d'un client, toujours rattaché à une vente. */
@Entity('client_payments')
@Index('IDX_client_payments_created_at', ['createdAt'])
export class ClientPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_client_payments_sale')
  @Column({ name: 'sale_id', type: 'int' })
  saleId: number;

  @ManyToOne(() => Sale, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_id', foreignKeyConstraintName: 'FK_client_payments_sale' })
  sale: Sale;

  // Copie du client de la vente : permet de lister ses paiements directement.
  @Index('IDX_client_payments_client')
  @Column({ name: 'client_id', type: 'int', nullable: true })
  clientId: number | null;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id', foreignKeyConstraintName: 'FK_client_payments_client' })
  client: Client | null;

  @Column({ type: 'bigint', transformer: numericTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  method: PaymentMethod;

  // N° de transaction Orange Money / MoMo, n° de chèque…
  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  // Qui a encaissé.
  @Index('IDX_client_payments_user')
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_client_payments_user' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  status: PaymentStatus;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Index('IDX_client_payments_cancelled_by')
  @Column({ name: 'cancelled_by_id', type: 'int', nullable: true })
  cancelledById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'cancelled_by_id',
    foreignKeyConstraintName: 'FK_client_payments_cancelled_by',
  })
  cancelledBy: User | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
