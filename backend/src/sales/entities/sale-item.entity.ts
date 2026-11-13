import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric';
import { Product } from '../../products/entities/product.entity';
import { Sale } from './sale.entity';

/**
 * Ligne de vente. Nom, unité, prix de vente et prix d'achat sont COPIÉS au
 * moment de la vente : si le produit change ensuite, la facture reste juste.
 */
@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_sale_items_sale')
  @Column({ name: 'sale_id', type: 'int' })
  saleId: number;

  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_id', foreignKeyConstraintName: 'FK_sale_items_sale' })
  sale: Sale;

  @Index('IDX_sale_items_product')
  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'product_id',
    foreignKeyConstraintName: 'FK_sale_items_product',
  })
  product: Product;

  @Column({ name: 'product_name', length: 150 })
  productName: string;

  @Column({ length: 20 })
  unit: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  quantity: number;

  @Column({ name: 'unit_price', type: 'bigint', transformer: numericTransformer })
  unitPrice: number;

  // Prix d'achat au moment de la vente (calcul des marges, phase 11).
  @Column({ name: 'unit_cost', type: 'bigint', transformer: numericTransformer })
  unitCost: number;

  @Column({ name: 'line_total', type: 'bigint', transformer: numericTransformer })
  lineTotal: number;
}
