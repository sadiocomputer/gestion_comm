# Sécurité — décisions et vérifications

Mis à jour : 12/11/2026 (phase 12b).

## Protections en place

| Domaine | Mesure |
|---|---|
| Mots de passe | Argon2id ; 8 caractères minimum ; jamais renvoyés par l'API (`select: false`) |
| Connexion | Message d'erreur générique ; temps de réponse constant (hash factice) ; 10 essais / minute / IP |
| Session | Access token 15 min en mémoire côté navigateur ; refresh token dans un cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production, limité à `/api/auth` ; rotation à chaque usage ; réutilisation d'un vieux jeton = fermeture de toutes les sessions ; purge des jetons expirés toutes les 6 h |
| CSRF | `/auth/refresh` et `/auth/logout` exigent l'en-tête `Origin` = `CORS_ORIGIN` |
| Droits | `JwtAuthGuard` + `PermissionsGuard` relus en base à chaque requête ; **interdit par défaut** : une route sans `@RequirePermissions` / `@RequireAnyPermission` est refusée |
| Données | DTO + `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`) ; requêtes SQL paramétrées ; montants recalculés par le serveur |
| Concurrence | Transactions + verrous de ligne (stock, paiements, annulations) |
| Erreurs | Aucune trace technique renvoyée au client (`AllExceptionsFilter`) |
| En-têtes | Helmet ; CORS limité à une seule origine |
| Configuration | Variables `.env` validées au démarrage (secret JWT ≥ 32 caractères) |

## Alertes `npm audit` acceptées

| Paquet | Gravité | Pourquoi c'est accepté |
|---|---|---|
| `glob`, `minimatch` (dépendances internes de `typeorm`) | modérée | Utilisés par TypeORM uniquement pour lister les fichiers d'entités / migrations à partir de chemins écrits dans le code. Aucune donnée utilisateur n'y passe : non exploitable ici. La seule « correction » proposée (`--force`) rétrograde `typeorm` en 0.3.17 et casse le projet. **À revérifier à chaque nouvelle version de `typeorm`.** |
| Alertes des outils de développement (Jest, ESLint…) | faible / modérée | Jamais déployés en production. |

⚠️ **Ne jamais lancer `npm audit fix --force`** : il change de génération ou rétrograde des paquets sans vérifier que le projet fonctionne.

## À vérifier avant chaque mise en production

- [ ] `NODE_ENV=production` (active le cookie `Secure`)
- [ ] Site servi **uniquement en HTTPS**
- [ ] `JWT_ACCESS_SECRET` propre à la production, long et aléatoire (jamais celui du développement ou des tests)
- [ ] `TRUST_PROXY=1` si l'application est derrière Nginx
- [ ] `CORS_ORIGIN` = l'adresse exacte du site (ex. `https://boutique.exemple.com`)
- [ ] Utilisateur MySQL dédié (pas `root`), avec droits limités à la base de l'application
- [ ] `npm run test:e2e` : tous les tests passent
- [ ] Sauvegarde de la base effectuée avant toute migration (`deploy/backup/backup.sh`)
- [ ] Sauvegarde nocturne programmée, copie hors du VPS activée, restauration testée le mois dernier (voir `deploy/backup/README.md`)
