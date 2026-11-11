import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

/**
 * @Global : RolesService est disponible dans tous les modules sans import,
 * car PermissionsGuard (qui en dépend) sera utilisé partout.
 */
@Global()
@Module({
  // forFeature enregistre les entités (autoLoadEntities les charge ensuite).
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
