#!/bin/bash
# GymTrack Restore Script
# Restores encrypted database backup

set -euo pipefail

# Configuration
BACKUP_DIR="/home/noki/gymtrack-data/backups"
DB_PATH="/home/noki/gymtrack-data/gymtrack.db"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-change-this-key-in-production}"

# Check for backup file argument
if [ -z "${1:-}" ]; then
    echo "Available backups:"
    ls -lht "${BACKUP_DIR}"/gymtrack_*.db.gz.enc 2>/dev/null || echo "No backups found"
    echo ""
    echo "Usage: $0 <backup_file>"
    exit 1
fi

BACKUP_FILE="${1}"

# Verify backup exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Confirm restore
echo "WARNING: This will replace the current database!"
echo "Current database: ${DB_PATH}"
echo "Backup to restore: ${BACKUP_FILE}"
read -p "Continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled"
    exit 0
fi

# Stop backend container (optional, for safety)
echo "Warning: Backend container should be stopped for restore"
read -p "Stop backend container? (yes/no): " -r
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    docker stop gymtrack-backend || true
    echo "Backend stopped"
fi

# Backup current database (just in case)
if [ -f "${DB_PATH}" ]; then
    CURRENT_BACKUP="${DB_PATH}.pre-restore.$(date +%Y%m%d_%H%M%S)"
    cp "${DB_PATH}" "${CURRENT_BACKUP}"
    echo "Current database backed up to: ${CURRENT_BACKUP}"
fi

# Restore
echo "Restoring database..."
openssl enc -aes-256-cbc -d -pbkdf2 -pass pass:"${ENCRYPTION_KEY}" -in "${BACKUP_FILE}" | gunzip > "${DB_PATH}"

# Verify restore
if [ -f "${DB_PATH}" ]; then
    SIZE=$(du -h "${DB_PATH}" | cut -f1)
    echo "Database restored successfully: ${SIZE}"
    echo "Restore completed at $(date)" >> "${BACKUP_DIR}/restore.log"
else
    echo "ERROR: Restore failed"
    exit 1
fi

# Restart backend if stopped
if docker ps -a --format '{{.Names}}' | grep -q "gymtrack-backend"; then
    echo "Restarting backend..."
    docker start gymtrack-backend
    sleep 3
    echo "Backend restarted"
fi

echo "Restore complete!"