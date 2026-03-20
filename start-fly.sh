#!/bin/sh

# DBが存在しなければ seed データを投入
cd /app/backend
if [ ! -f /data/g_ranche.db ]; then
  echo "初回起動: データベースを作成します..."
  python seed.py
  echo "シードデータを投入しました"
fi

# Backend 起動
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &

# Frontend 起動
cd /app/frontend
npx next start --port 3000 --hostname 0.0.0.0 &

# Caddy 起動（フォアグラウンド）
caddy run --config /etc/caddy/Caddyfile
