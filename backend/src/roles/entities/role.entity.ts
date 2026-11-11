import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_roles_name', { unique: true })
  @Column({ length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // Rôle système (Administrateur) : ni supprimable ni modifiable.
  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  // Table de liaison role_permissions (role_id, permission_id).
  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_role_permissions_role',
    },
    inverseJoinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_role_permissions_permission',
    },
  })
  permissions: Permission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
