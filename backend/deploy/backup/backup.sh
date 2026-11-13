#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Sauvegarde de la base gestion_comm (à lancer chaque nuit par cron).
#
#  - copie complète avec mysqldump, compressée (.sql.gz) ;
#  - vérifiée avant d'être gardée (archive lisible + dump terminé) ;
#  - conserve les KEEP_DAILY dernières nuits et, le dimanche, une copie
#    hebdomadaire (KEEP_WEEKLY dernières semaines) ;
#  - copie hors du VPS avec rclone SI RCLONE_REMOTE est renseigné.
#
# Identifiants MySQL : lus dans ~/.my.cnf (jamais dans ce script).
# Messages : sortie standard -> journal système (voir README.md).
# ---------------------------------------------------------------------------
set -euo pipefail

DB_NAME="${DB_NAME:-gestion_comm}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gestion_comm}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
# Ex. "gdrive:sauvegardes/gestion_comm" ou "b2:mon-bucket/gestion_comm". Vide = pas d'envoi.
RCLONE_REMOTE="${RCLONE_REMOTE:-}"

fail() {
  echo "ÉCHEC : $*" >&2
  exit 1
}

# Fichiers lisibles uniquement par l'utilisateur qui sauvegarde.
umask 077
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

STAMP="$(date +%Y-%m-%d_%H%M)"
FILE="$BACKUP_DIR/daily/${DB_NAME}_${STAMP}.sql.gz"
TMP="$FILE.part"
trap 'rm -f "$TMP"' EXIT # en cas d'erreur, pas de fichier à moitié écrit

echo "Sauvegarde de $DB_NAME…"

# --single-transaction : photo cohérente sans bloquer les ventes en cours (InnoDB).
# --no-tablespaces     : évite d'avoir besoin du droit PROCESS.
mysqldump --single-transaction --quick --no-tablespaces --default-character-set=utf8mb4 "$DB_NAME" \
  | gzip -9 > "$TMP" \
  || fail "mysqldump n'a pas pu lire la base $DB_NAME."

# Vérifications : archive intacte, et mysqldump est allé jusqu'au bout.
gzip -t "$TMP" || fail "archive corrompue."
zcat "$TMP" | tail -n 1 | grep -q "Dump completed" || fail "dump incomplet."

mv "$TMP" "$FILE"
echo "OK : $FILE ($(du -h "$FILE" | cut -f1))"

# Le dimanche (jour 7) : copie hebdomadaire.
if [ "$(date +%u)" = "7" ]; then
  cp "$FILE" "$BACKUP_DIR/weekly/"
  echo "Copie hebdomadaire gardée."
fi

# Rotation : on garde les plus récentes, on supprime les autres.
prune() { # prune <dossier> <nombre à garder>
  # « || true » : un dossier encore vide (ls échoue) ne doit pas arrêter le script.
  ls -1t "$1"/*.sql.gz 2>/dev/null | tail -n +"$(($2 + 1))" | xargs -r rm -f -- || true
}
prune "$BACKUP_DIR/daily" "$KEEP_DAILY"
prune "$BACKUP_DIR/weekly" "$KEEP_WEEKLY"

# Copie hors du VPS (facultative).
if [ -n "$RCLONE_REMOTE" ]; then
  rclone copy "$FILE" "$RCLONE_REMOTE/daily/" || fail "envoi rclone impossible (la sauvegarde locale est bien faite)."
  if [ "$(date +%u)" = "7" ]; then
    rclone copy "$FILE" "$RCLONE_REMOTE/weekly/" || fail "envoi rclone hebdomadaire impossible."
  fi
  # Même durée de conservation à distance.
  rclone delete --min-age "${KEEP_DAILY}d" "$RCLONE_REMOTE/daily/" || true
  rclone delete --min-age "$((KEEP_WEEKLY * 7))d" "$RCLONE_REMOTE/weekly/" || true
  echo "Copie envoyée vers $RCLONE_REMOTE."
fi

echo "Sauvegarde terminée."
