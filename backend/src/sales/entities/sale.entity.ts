import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { numericTransformer } from '../../common/utils/numeric';
import { User } from '../../users/entities/user.entity';
import { SaleItem } from './sale-item.entity';

export const SALE_STATUSES = ['COMPLETED', 'CANCELLED'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

@Entity('sales')
@Index('IDX_sales_created_at', ['createdAt'])
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  // Numéro de facture "F2026-000123", calculé à partir de l'id juste après
  // l'insertion (NULL pendant une fraction de seconde dans la transaction).
  @Index('IDX_sales_number', { unique: true })
  @Column({ type: 'varchar', length: 30, nullable: true })
  number: string | null;

  // NULL = client de passage.
  @Index('IDX_sales_client')
  @Column({ name: 'client_id', type: 'int', nullable: true })
  clientId: number | null;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id', foreignKeyConstraintName: 'FK_sales_client' })
  client: Client | null;

  // Vendeur.
  @Index('IDX_sales_user')
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_sales_user' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  status: SaleStatus;

  // Montants en GNF entiers, calculés par le serveur.
  @Column({ type: 'bigint', transformer: numericTransformer })
  subtotal: number;

  @Column({ type: 'bigint', transformer: numericTransformer })
  discount: number;

  @Column({ type: 'bigint', transformer: numericTransformer })
  total: number;

  // Total des paiements VALIDES. Mis à jour dans la même transaction que
  // chaque paiement / annulation (verrou sur la vente). Reste = total - amountPaid.
  @Column({
    name: 'amount_paid',
    type: 'bigint',
    default: 0,
    transformer: numericTransformer,
  })
  amountPaid: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @OneToMany(() => SaleItem, (item) => item.sale)
  items: SaleItem[];

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Index('IDX_sales_cancelled_by')
  @Column({ name: 'cancelled_by_id', type: 'int', nullable: true })
  cancelledById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'cancelled_by_id',
    foreignKeyConstraintName: 'FK_sales_cancelled_by',
  })
  cancelledBy: User | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
