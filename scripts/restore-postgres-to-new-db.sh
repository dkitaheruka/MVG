#!/usr/bin/env bash
set -euo pipefail
umask 077

archive="${1:-}"
target_db="${MVG_RESTORE_DATABASE:-}"
identity_file="${MVG_AGE_IDENTITY_FILE:-}"
if [[ -z "$archive" || ! -f "$archive" ]]; then
  echo "Usage: MVG_RESTORE_DATABASE=mvg_restore_YYYYMMDD MVG_AGE_IDENTITY_FILE=/secure/key.txt ./scripts/restore-postgres-to-new-db.sh /path/to/backup.dump.age" >&2
  exit 2
fi
if [[ ! "$target_db" =~ ^mvg_restore_[a-zA-Z0-9_]+$ ]]; then
  echo "MVG_RESTORE_DATABASE must use the new, isolated mvg_restore_* name. Existing databases are never overwritten." >&2
  exit 2
fi
[[ -f "$identity_file" ]] || { echo 'Set MVG_AGE_IDENTITY_FILE to the protected age private identity file.' >&2; exit 2; }
temporary_dir="$(mktemp -d)"
trap 'rm -rf "$temporary_dir"' EXIT
age --decrypt --identity "$identity_file" --output "$temporary_dir/mvg.dump" "$archive"
docker compose --env-file .env.production exec -T db pg_restore --list < "$temporary_dir/mvg.dump" >/dev/null
docker compose --env-file .env.production exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$target_db"
docker compose --env-file .env.production exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --no-acl --exit-on-error' sh "$target_db" < "$temporary_dir/mvg.dump"
printf 'Restored into isolated database %s. Validate it before changing DATABASE_URL.\n' "$target_db"
