import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_suppliers_name')
  @Column({ length: 120 })
  name: string;

  // Personne à contacter chez le fournisseur.
  @Column({ name: 'contact_name', type: 'varchar', length: 120, nullable: true })
  contactName: string | null;

  // Guinéen (620000000) ou international (+8613800000000).
  @Index('IDX_suppliers_phone')
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  // Archivage au lieu de suppression : les achats y feront référence.
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
