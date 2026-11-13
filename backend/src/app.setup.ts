import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Sert le frontend compilé (Vite) sur le même port que l'API :
 *  - /api/...            -> NestJS (inchangé) ;
 *  - /assets/...         -> fichiers du build, gardés 1 an en cache (leur nom
 *                           change à chaque build : jamais de version périmée) ;
 *  - toute autre adresse -> index.html : c'est React Router qui affiche la
 *                           bonne page (/sales/12, /products…), même après F5.
 */
function serveClient(app: NestExpressApplication, dir: string): void {
  const root = resolve(dir);
  const indexHtml = join(root, 'index.html');
  if (!existsSync(indexHtml)) {
    throw new Error(
      `CLIENT_DIST : index.html introuvable dans ${root}. Lancez « npm run build » dans client/.`,
    );
  }

  app.useStaticAssets(root, {
    index: false, // « / » est géré par le repli ci-dessous
    setHeaders: (res, filePath) => {
      res.setHeader(
        'Cache-Control',
        filePath.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
    },
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const isPage = req.method === 'GET' || req.method === 'HEAD';
    const isApi = req.path === '/api' || req.path.startsWith('/api/');
    // Un fichier de /assets absent doit rester une erreur 404 (et non une
    // page HTML) : le frontend affiche alors « Nouvelle version disponible ».
    if (!isPage || isApi || req.path.startsWith('/assets/')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache'); // index.html toujours à jour
    res.sendFile(indexHtml);
  });

  new Logger('Client').log(`Application web servie depuis ${root}`);
}

/**
 * Configuration commune à l'application réelle (main.ts) et aux tests e2e :
 * les tests vérifient ainsi exactement le même comportement que le serveur.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  // Derrière Nginx, sans ce réglage, toutes les requêtes sembleraient venir
  // de l'IP de Nginx : la limite « 10 essais par minute » bloquerait tout le
  // monde à la fois. Avec 1, Express lit la vraie IP dans X-Forwarded-For
  // (posé par Nginx), sans faire confiance à un en-tête inventé plus loin.
  const trustProxy = Number(config.get('TRUST_PROXY') ?? 0);
  if (trustProxy > 0) {
    (app as NestExpressApplication).set('trust proxy', trustProxy);
  }

  app.setGlobalPrefix('api');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // « Passe tout en https » : utile en production (HTTPS obligatoire),
          // mais empêcherait de tester en http (ex. http://192.168.1.10:3000
          // depuis un téléphone) : la page s'afficherait sans style ni script.
          upgradeInsecureRequests: config.get('NODE_ENV') === 'production' ? [] : null,
        },
      },
    }),
  );

  const clientDist = config.get<string>('CLIENT_DIST');
  if (clientDist) {
    serveClient(app as NestExpressApplication, clientDist);
  }

  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
