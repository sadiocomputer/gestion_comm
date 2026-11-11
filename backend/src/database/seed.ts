import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { normalizeGuineaPhone } from '../common/utils/phone';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';

/**
 * Prépare les données de base. Peut être relancé sans risque.
 * 1. Crée l'administrateur si la table users est vide.
 * 2. Recopie le catalogue des permissions et crée les rôles de départ.
 * 3. Attribue le rôle Administrateur au compte ADMIN_PHONE.
 */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const usersService = app.get(UsersService);
    const rolesService = app.get(RolesService);
    const config = app.get(ConfigService);

    const created = await usersService.seedAdminIfEmpty();
    console.log(
      created
        ? 'Administrateur créé.'
        : 'Des utilisateurs existent déjà. Aucun compte créé.',
    );

    await rolesService.syncCatalog();
    console.log('Permissions et rôles synchronisés.');

    const adminPhone = normalizeGuineaPhone(
      config.getOrThrow<string>('ADMIN_PHONE'),
    );
    if (!adminPhone) {
      throw new Error('ADMIN_PHONE du .env est invalide.');
    }
    const admin = await rolesService.grantAdminRole(adminPhone);
    console.log(`Rôle Administrateur attribué à ${admin.name}.`);
  } finally {
    await app.close();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
