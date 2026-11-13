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
import { Product } from '../../products/entities/product.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';

export const MOVEMENT_TYPES = [
  'IN',
  'OUT',
  'ADJUSTMENT',
  'SALE',
  'SALE_CANCEL',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/**
 * Journal des mouvements : une ligne par variation de stock.
 * Ces lignes ne sont jamais modifiées ni supprimées (traçabilité).
 */
@Entity('stock_movements')
@Index('IDX_stock_movements_product_date', ['productId', 'createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'product_id',
    foreignKeyConstraintName: 'FK_stock_movements_product',
  })
  product: Product;

  // IN = entrée, OUT = sortie, ADJUSTMENT = inventaire,
  // SALE = vente, SALE_CANCEL = annulation de vente (stock restitué)
  @Column({ type: 'varchar', length: 20 })
  type: MovementType;

  // Variation signée : +10 pour une entrée, -3 pour une sortie.
  @Column({
    name: 'quantity_change',
    type: 'decimal',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  quantityChange: number;

  @Column({
    name: 'quantity_before',
    type: 'decimal',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  quantityBefore: number;

  @Column({
    name: 'quantity_after',
    type: 'decimal',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  quantityAfter: number;

  // Coût unitaire d'achat (entrées) : servira au calcul des dettes fournisseurs.
  @Column({
    name: 'unit_cost',
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  unitCost: number | null;

  @Index('IDX_stock_movements_supplier')
  @Column({ name: 'supplier_id', type: 'int', nullable: true })
  supplierId: number | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'supplier_id',
    foreignKeyConstraintName: 'FK_stock_movements_supplier',
  })
  supplier: Supplier | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  // Vente à l'origine du mouvement (SALE / SALE_CANCEL). Simple colonne
  // indexée, sans relation TypeORM, pour éviter une dépendance circulaire
  // entre les modules Stocks et Ventes.
  @Index('IDX_stock_movements_sale')
  @Column({ name: 'sale_id', type: 'int', nullable: true })
  saleId: number | null;

  // Qui a fait le mouvement.
  @Index('IDX_stock_movements_user')
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_stock_movements_user',
  })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
