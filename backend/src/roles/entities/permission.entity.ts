import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Une permission = une action protégée dans le code (ex. "users.create").
 * Les lignes de cette table sont recopiées depuis permissions.catalog.ts
 * par le seed : on ne les crée pas depuis l'interface.
 */
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_permissions_code', { unique: true })
  @Column({ length: 100 })
  code: string;

  @Column({ length: 150 })
  label: string;

  // Sert à regrouper les cases à cocher dans l'interface.
  @Column({ length: 50 })
  module: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
