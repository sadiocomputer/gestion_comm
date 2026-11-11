import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const usersService = app.get(UsersService);
    const created = await usersService.seedAdminIfEmpty();
    if (created) {
      console.log('Administrateur créé.');
    } else {
      console.log('Un utilisateur existe déjà. Aucun compte créé.');
    }
  } finally {
    await app.close();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
