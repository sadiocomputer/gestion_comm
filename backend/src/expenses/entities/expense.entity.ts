import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateOnlyTransformer, numericTransformer } from '../../common/utils/numeric';
import type { PaymentMethod, PaymentStatus } from '../../payments/payment.constants';
import { User } from '../../users/entities/user.entity';
import { ExpenseCategory } from './expense-category.entity';

/** Dépense de la boutique. Jamais supprimée : annulée avec un motif. */
@Entity('expenses')
@Index('IDX_expenses_date', ['expenseDate'])
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_expenses_category')
  @Column({ name: 'category_id', type: 'int' })
  categoryId: number;

  @ManyToOne(() => ExpenseCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id', foreignKeyConstraintName: 'FK_expenses_category' })
  category: ExpenseCategory;

  // GNF entiers.
  @Column({ type: 'bigint', transformer: numericTransformer })
  amount: number;

  @Column({ length: 255 })
  description: string;

  // Jour de la dépense (peut être antérieur à la saisie), sans heure.
  @Column({ name: 'expense_date', type: 'date', transformer: dateOnlyTransformer })
  expenseDate: string;

  @Column({ type: 'varchar', length: 20 })
  method: PaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  // Qui a saisi la dépense.
  @Index('IDX_expenses_user')
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_expenses_user' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  status: PaymentStatus;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Index('IDX_expenses_cancelled_by')
  @Column({ name: 'cancelled_by_id', type: 'int', nullable: true })
  cancelledById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cancelled_by_id', foreignKeyConstraintName: 'FK_expenses_cancelled_by' })
  cancelledBy: User | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
