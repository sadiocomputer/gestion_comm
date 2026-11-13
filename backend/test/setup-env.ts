import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

/**
 * Exécuté par Jest AVANT chaque fichier de test : charge .env.test.
 * override: true -> ces valeurs remplacent celles du .env de développement.
 */
const envFile = resolve(__dirname, '../.env.test');
if (!existsSync(envFile)) {
  throw new Error(
    'Fichier backend/.env.test introuvable. Copiez .env.test.example en .env.test et remplissez-le.',
  );
}
// quiet : pas de message « injected env » (affiché en rouge par Jest, trompeur).
config({ path: envFile, override: true, quiet: true });

// Garde-fou : les tests VIDENT la base. Jamais sur une base qui n'est pas de test.
if (!process.env.DB_NAME?.endsWith('_test')) {
  throw new Error(
    `Sécurité : DB_NAME="${process.env.DB_NAME}" ne finit pas par "_test". Les tests refusent de vider cette base.`,
  );
}
