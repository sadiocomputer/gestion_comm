#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Restauration d'une sauvegarde de gestion_comm.
#
#   sudo ./restore.sh <fichier.sql.gz> [base_cible]
#
#   base_cible : gestion_comm par défaut. Pour un simple TEST, utilisez une
#   autre base (ex. gestion_comm_verif) : la vraie base n'est pas touchée.
#
# Sécurités :
#  - l'archive est vérifiée avant de commencer ;
#  - il faut retaper le nom de la base pour confirmer ;
#  - si la base existe, elle est d'abord sauvegardée (« avant-restauration »).
#
# Identifiants : ceux de MySQL root (sudo, sous Ubuntu) ou ~/.my.cnf.
# ---------------------------------------------------------------------------
set -euo pipefail

FILE="${1:-}"
TARGET_DB="${2:-gestion_comm}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gestion_comm}"

if [ -z "$FILE" ]; then
  echo "Usage : $0 <fichier.sql.gz> [base_cible]"
  echo "Sauvegardes disponibles :"
  ls -1t "$BACKUP_DIR"/daily/*.sql.gz "$BACKUP_DIR"/weekly/*.sql.gz 2>/dev/null || echo "  (aucune)"
  exit 1
fi
[ -f "$FILE" ] || { echo "Fichier introuvable : $FILE"; exit 1; }
# Nom de base : lettres, chiffres et _ uniquement (il est placé dans du SQL).
[[ "$TARGET_DB" =~ ^[A-Za-z0-9_]+$ ]] || { echo "Nom de base invalide : $TARGET_DB"; exit 1; }

gzip -t "$FILE" || { echo "Archive corrompue : restauration annulée."; exit 1; }

echo
echo "  Fichier : $FILE"
echo "  Base    : $TARGET_DB"
echo
echo "  ATTENTION : le contenu actuel de « $TARGET_DB » sera REMPLACÉ."
echo
read -r -p "Pour confirmer, tapez le nom de la base : " answer
[ "$answer" = "$TARGET_DB" ] || { echo "Annulé : rien n'a été modifié."; exit 1; }

umask 077
if mysql -e "USE \`$TARGET_DB\`" 2>/dev/null; then
  SAFETY="$BACKUP_DIR/avant-restauration_${TARGET_DB}_$(date +%Y-%m-%d_%H%M).sql.gz"
  mkdir -p "$BACKUP_DIR"
  echo "Sauvegarde de sécurité de l'état actuel…"
  mysqldump --single-transaction --quick --no-tablespaces --default-character-set=utf8mb4 "$TARGET_DB" \
    | gzip -9 > "$SAFETY"
  echo "  -> $SAFETY (pour revenir en arrière si besoin)"
fi

mysql -e "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB\` CHARACTER SET utf8mb4"
echo "Restauration en cours (l'application doit être arrêtée)…"
zcat "$FILE" | mysql --default-character-set=utf8mb4 "$TARGET_DB"

echo "Restauration terminée dans « $TARGET_DB »."
