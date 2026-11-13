import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';
import type { PaymentMethod, PaymentStatus } from '../payment.constants';

/** Paiement à un fournisseur : réduit sa dette globale. */
@Entity('supplier_payments')
@Index('IDX_supplier_payments_created_at', ['createdAt'])
export class SupplierPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_supplier_payments_supplier')
  @Column({ name: 'supplier_id', type: 'int' })
  supplierId: number;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'supplier_id',
    foreignKeyConstraintName: 'FK_supplier_payments_supplier',
  })
  supplier: Supplier;

  @Column({ type: 'bigint', transformer: numericTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  method: PaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @Index('IDX_supplier_payments_user')
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_supplier_payments_user' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  status: PaymentStatus;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Index('IDX_supplier_payments_cancelled_by')
  @Column({ name: 'cancelled_by_id', type: 'int', nullable: true })
  cancelledById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'cancelled_by_id',
    foreignKeyConstraintName: 'FK_supplier_payments_cancelled_by',
  })
  cancelledBy: User | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
