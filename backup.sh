#!/bin/bash
# PostgreSQL バックアップスクリプト（Oracle Cloud VM用）
# cron設定例: 0 3 * * * /home/ubuntu/g-ranche/backup.sh >> /home/ubuntu/backups/backup.log 2>&1

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# pg_dump でバックアップ
docker compose exec -T db pg_dump -U granche granche > "$BACKUP_DIR/granche_$DATE.sql"

# 7日以上前のバックアップを削除
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete

echo "バックアップ完了: granche_$DATE.sql"
