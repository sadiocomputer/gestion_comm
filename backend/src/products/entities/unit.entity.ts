import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Unité de vente proposée dans le formulaire produit (pièce, sac, kg…).
 * Le produit garde une copie du nom (products.unit) : renommer une unité
 * met aussi à jour les produits qui l'utilisent.
 */
@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn()
  id: number;

  // 20 caractères : même taille que products.unit.
  @Index('IDX_units_name', { unique: true })
  @Column({ length: 20 })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
