import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Catégorie de dépense (loyer, électricité, salaires…). */
@Entity('expense_categories')
export class ExpenseCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_expense_categories_name', { unique: true })
  @Column({ length: 60 })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
