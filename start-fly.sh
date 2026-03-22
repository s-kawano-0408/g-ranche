#!/bin/sh

# テーブル作成 & シードデータ投入（テーブルが空の場合のみ）
cd /app/backend
python -c "
from database import Base, engine, SessionLocal
from models.client import Client
Base.metadata.create_all(bind=engine)
db = SessionLocal()
if db.query(Client).first() is None:
    db.close()
    print('初回起動: シードデータを投入します...')
    import subprocess
    subprocess.run(['python', 'seed.py'], check=True)
    print('シードデータを投入しました')
else:
    db.close()
    print('既存データあり: シードをスキップします')
"

# Backend 起動
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &

# Frontend 起動
cd /app/frontend
npx next start --port 3000 --hostname 0.0.0.0 &

# Caddy 起動（フォアグラウンド）
caddy run --config /etc/caddy/Caddyfile
