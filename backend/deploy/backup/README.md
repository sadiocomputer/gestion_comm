# Sauvegarde de la base — mode d'emploi (VPS Ubuntu)

Chaque nuit à 2 h, `backup.sh` fait une copie complète de la base `gestion_comm`, la compresse, la vérifie, puis supprime les plus anciennes.

| Gardé sur le VPS | Où |
|---|---|
| Les **7 dernières nuits** | `/var/backups/gestion_comm/daily/` |
| **1 par dimanche**, 4 semaines | `/var/backups/gestion_comm/weekly/` |

> ⚠️ Une sauvegarde qui reste **uniquement** sur le VPS disparaît avec lui (panne, piratage, suppression du serveur). Activez au moins une copie hors du VPS (étape 5).

---

## 1. Installer les scripts

```bash
sudo mkdir -p /opt/gestion_comm/backup
sudo cp backend/deploy/backup/*.sh /opt/gestion_comm/backup/
sudo chmod 700 /opt/gestion_comm/backup/*.sh
```

## 2. Créer un utilisateur MySQL réservé à la sauvegarde (lecture seule)

Dans `sudo mysql` :

```sql
CREATE USER 'backup'@'localhost' IDENTIFIED BY 'UN_MOT_DE_PASSE_LONG';
GRANT SELECT, SHOW VIEW, TRIGGER, LOCK TABLES ON gestion_comm.* TO 'backup'@'localhost';
```

Cet utilisateur **ne peut rien modifier** : même volé, son mot de passe ne permet pas d'abîmer les données.

## 3. Donner ses identifiants au script (sans les écrire dans le script)

```bash
sudo nano /root/.my.cnf
```

```ini
[mysqldump]
user=backup
password=UN_MOT_DE_PASSE_LONG
```

```bash
sudo chmod 600 /root/.my.cnf   # lisible par root uniquement
```

## 4. Tester, puis programmer chaque nuit

```bash
sudo /opt/gestion_comm/backup/backup.sh     # doit finir par « Sauvegarde terminée. »
sudo crontab -e
```

Ajouter la ligne :

```cron
0 2 * * * /opt/gestion_comm/backup/backup.sh 2>&1 | logger -t gestion_comm-backup
```

Pour lire les messages (pas de fichier de log : tout va dans le journal système) :

```bash
journalctl -t gestion_comm-backup --since "2 days ago"
```

## 5. Copie hors du VPS (fortement conseillé)

**A. Snapshots de l'hébergeur.** Activez-les dans l'espace client de l'hébergeur (souvent 1 à 2 €/mois). Ils copient le serveur entier.

**B. Envoi chaque nuit vers un stockage en ligne** (Google Drive, Backblaze B2…) avec `rclone` :

```bash
sudo apt install rclone
sudo rclone config              # créer une destination, ex. nommée « gdrive »
sudo crontab -e                 # puis modifier la ligne :
```

```cron
0 2 * * * RCLONE_REMOTE="gdrive:sauvegardes/gestion_comm" /opt/gestion_comm/backup/backup.sh 2>&1 | logger -t gestion_comm-backup
```

Si l'envoi échoue, la sauvegarde locale est quand même faite et le journal l'indique.

## 6. Restaurer

> Une sauvegarde **jamais testée** n'est pas une sauvegarde. Faites ce test **une fois par mois**.

**Tester sans risque** (restaure dans une base à part, la vraie n'est pas touchée) :

```bash
sudo /opt/gestion_comm/backup/restore.sh        # liste les sauvegardes disponibles
sudo /opt/gestion_comm/backup/restore.sh /var/backups/gestion_comm/daily/gestion_comm_2026-11-13_0200.sql.gz gestion_comm_verif
sudo mysql -e "SELECT COUNT(*) FROM gestion_comm_verif.sales"
sudo mysql -e "DROP DATABASE gestion_comm_verif"   # nettoyage après vérification
```

**Restaurer pour de vrai** (après une erreur grave) :

1. Arrêter l'application (sinon des ventes pourraient s'enregistrer pendant la restauration).
2. `sudo /opt/gestion_comm/backup/restore.sh <fichier.sql.gz>` puis taper `gestion_comm` pour confirmer.
   L'état actuel est d'abord sauvegardé dans `avant-restauration_…sql.gz` : on peut revenir en arrière.
3. Redémarrer l'application.

## Réglages possibles

Variables à placer devant la commande dans la ligne cron :

| Variable | Défaut | Rôle |
|---|---|---|
| `DB_NAME` | `gestion_comm` | Base à sauvegarder |
| `BACKUP_DIR` | `/var/backups/gestion_comm` | Dossier des sauvegardes |
| `KEEP_DAILY` | `7` | Nuits gardées |
| `KEEP_WEEKLY` | `4` | Dimanches gardés |
| `RCLONE_REMOTE` | *(vide)* | Destination hors VPS ; vide = pas d'envoi |
