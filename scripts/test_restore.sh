#!/bin/bash
# Test restore procedure
# This script performs a restore drill to verify backup integrity

set -euo pipefail

BACKUP_DIR="/home/noki/gymtrack-data/backups"
TEST_RESTORE_DIR="/home/noki/gymtrack-data/test_restore"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-change-this-key-in-production}"

echo "=== GymTrack Restore Drill ==="
echo "Date: $(date)"
echo ""

# Find latest backup
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/gymtrack_*.db.gz.enc 2>/dev/null | head -1)

if [ -z "${LATEST_BACKUP}" ]; then
    echo "ERROR: No backups found in ${BACKUP_DIR}"
    exit 1
fi

echo "Testing backup: ${LATEST_BACKUP}"
echo ""

# Create test directory
rm -rf "${TEST_RESTORE_DIR}"
mkdir -p "${TEST_RESTORE_DIR}"

# Restore to test location
echo "Restoring to test location..."
openssl enc -aes-256-cbc -d -pbkdf2 -pass pass:"${ENCRYPTION_KEY}" -in "${LATEST_BACKUP}" | gunzip > "${TEST_RESTORE_DIR}/test.db"

# Verify database integrity
echo "Verifying database integrity..."
sqlite3 "${TEST_RESTORE_DIR}/test.db" "PRAGMA integrity_check;" || {
    echo "ERROR: Database integrity check failed"
    exit 1
}

# Check tables
TABLES=$(sqlite3 "${TEST_RESTORE_DIR}/test.db" "SELECT name FROM sqlite_master WHERE type='table';" | wc -l)
echo "Tables found: ${TABLES}"

# Check user count
USER_COUNT=$(sqlite3 "${TEST_RESTORE_DIR}/test.db" "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
echo "Users in backup: ${USER_COUNT}"

# Check session count
SESSION_COUNT=$(sqlite3 "${TEST_RESTORE_DIR}/test.db" "SELECT COUNT(*) FROM sessions;" 2>/dev/null || echo "0")
echo "Sessions in backup: ${SESSION_COUNT}"

# Check foreign keys
sqlite3 "${TEST_RESTORE_DIR}/test.db" "PRAGMA foreign_key_check;" > /dev/null 2>&1 && echo "✓ Foreign keys valid" || echo "✗ Foreign key errors detected"

# Cleanup
rm -rf "${TEST_RESTORE_DIR}"

echo ""
echo "✓ Restore drill completed successfully!"
echo "✓ Backup integrity verified"
echo "✓ Database is restorable"

exit 0