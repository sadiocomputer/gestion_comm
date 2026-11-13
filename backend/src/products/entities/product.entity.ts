import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric';
import { Category } from './category.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_products_name')
  @Column({ length: 150 })
  name: string;

  // Référence ou code-barres. Unique s'il est renseigné (MySQL accepte
  // plusieurs NULL dans un index unique).
  @Index('IDX_products_sku', { unique: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string | null;

  @Index('IDX_products_category')
  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'category_id',
    foreignKeyConstraintName: 'FK_products_category',
  })
  category: Category | null;

  // "pièce", "kg", "sac", "carton", "litre"…
  @Column({ length: 20 })
  unit: string;

  // Prix en GNF entiers (pas de centimes).
  @Column({
    name: 'purchase_price',
    type: 'bigint',
    transformer: numericTransformer,
  })
  purchasePrice: number;

  @Column({ name: 'sale_price', type: 'bigint', transformer: numericTransformer })
  salePrice: number;

  // Stock actuel. Modifié UNIQUEMENT par StocksService (mouvements).
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  quantity: number;

  // Seuil d'alerte : 0 = pas d'alerte.
  @Column({
    name: 'min_stock',
    type: 'decimal',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  minStock: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
