#!/usr/bin/env bash
set -euo pipefail
umask 077

backup_dir="${MVG_BACKUP_DIR:-/var/backups/mvg}"
retention_days="${MVG_BACKUP_RETENTION_DAYS:-14}"
recipient="${MVG_AGE_RECIPIENT:-}"
remote="${MVG_BACKUP_REMOTE:-}"
command -v age >/dev/null || { echo 'Install age to encrypt backups before writing them to disk.' >&2; exit 1; }
[[ -n "$recipient" ]] || { echo 'Set MVG_AGE_RECIPIENT to the off-site backup encryption public key.' >&2; exit 1; }
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$backup_dir/mvg-$stamp.dump.age"
temporary_dir="$(mktemp -d)"
trap 'rm -rf "$temporary_dir"' EXIT

docker compose --env-file .env.production exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$temporary_dir/mvg.dump"
docker compose --env-file .env.production exec -T db pg_restore --list < "$temporary_dir/mvg.dump" >/dev/null
age --recipient "$recipient" --output "$archive" "$temporary_dir/mvg.dump"
chmod 600 "$archive"
test -s "$archive"
if [[ -n "$remote" ]]; then
  command -v rclone >/dev/null || { echo 'MVG_BACKUP_REMOTE is set but rclone is not installed.' >&2; exit 1; }
  rclone copy "$archive" "$remote"
fi
find "$backup_dir" -maxdepth 1 -type f -name 'mvg-*.dump.age' -mtime "+$retention_days" -delete
printf 'Backup created and archive structure verified: %s\n' "$archive"
if [[ -z "$remote" ]]; then
  printf 'Backup is encrypted locally but has not been copied off the VPS. Configure MVG_BACKUP_REMOTE for off-site protection.\n'
fi
