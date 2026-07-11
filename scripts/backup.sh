#!/bin/bash
# GymTrack Database Backup Script
# Creates encrypted backups with rotation and SQLite-safe procedure

set -euo pipefail

# Configuration
DB_PATH="/home/noki/gymtrack-data/gymtrack.db"
BACKUP_DIR="/home/noki/gymtrack-data/backups"
TEMP_DIR="/tmp/gymtrack-backup-$$"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-change-this-key-in-production}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="gymtrack_${TIMESTAMP}.db.gz.enc"

# Create directories
mkdir -p "${BACKUP_DIR}"
mkdir -p "${TEMP_DIR}"

# Check if database exists
if [ ! -f "${DB_PATH}" ]; then
    echo "ERROR: Database not found at ${DB_PATH}"
    exit 1
fi

# SQLite-safe backup using .backup API
echo "Creating SQLite-safe backup..."
sqlite3 "${DB_PATH}" ".backup '${TEMP_DIR}/gymtrack_backup.db'"

# Verify temporary backup
if [ ! -f "${TEMP_DIR}/gymtrack_backup.db" ]; then
    echo "ERROR: SQLite backup failed"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Compress and encrypt
echo "Compressing and encrypting backup: ${BACKUP_FILE}"
gzip -c "${TEMP_DIR}/gymtrack_backup.db" | openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"${ENCRYPTION_KEY}" > "${BACKUP_DIR}/${BACKUP_FILE}"

# Cleanup temp
rm -rf "${TEMP_DIR}"

# Verify backup
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "Backup created successfully: ${SIZE}"
    
    # Verify database integrity
    echo "Verifying backup integrity..."
    openssl enc -aes-256-cbc -d -pbkdf2 -pass pass:"${ENCRYPTION_KEY}" -in "${BACKUP_DIR}/${BACKUP_FILE}" | gunzip > /tmp/verify_$$.db
    INTEGRITY=$(sqlite3 /tmp/verify_$$.db "PRAGMA integrity_check;" 2>&1)
    rm -f /tmp/verify_$$.db
    
    if [ "${INTEGRITY}" = "ok" ]; then
        echo "✓ Backup integrity verified: ${INTEGRITY}"
    else
        echo "WARNING: Integrity check returned: ${INTEGRITY}"
    fi
else
    echo "ERROR: Backup creation failed"
    exit 1
fi

# Rotate old backups (keep last 30 days)
echo "Rotating old backups..."
find "${BACKUP_DIR}" -name "gymtrack_*.db.gz.enc" -type f -mtime +${RETENTION_DAYS} -delete

# Count remaining backups
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/gymtrack_*.db.gz.enc 2>/dev/null | wc -l)
echo "Total backups: ${BACKUP_COUNT}"

# Log completion
echo "Backup completed at $(date) - Size: ${SIZE} - Integrity: ${INTEGRITY}" >> "${BACKUP_DIR}/backup.log"

exit 0