#!/bin/bash
# 相談支援システム 起動スクリプト

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "=== 相談支援事業所 管理システム ==="
echo ""

# Check ANTHROPIC_API_KEY
if grep -q "your_api_key_here" "$BACKEND_DIR/.env" 2>/dev/null; then
  echo "⚠️  ANTHROPIC_API_KEY が設定されていません"
  echo "   $BACKEND_DIR/.env を編集してAPIキーを設定してください"
  echo ""
fi

# Start backend
echo "▶ バックエンド起動中 (http://localhost:8000)..."
cd "$BACKEND_DIR"

# Check if DB needs seeding
if [ ! -f "g_ranche.db" ]; then
  echo "  サンプルデータを投入中..."
  uv run python seed.py
fi

uv run python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

sleep 2

# Start frontend
echo "▶ フロントエンド起動中 (http://localhost:3000)..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ システム起動完了"
echo "   フロントエンド: http://localhost:3000"
echo "   API ドキュメント: http://localhost:8000/docs"
echo ""
echo "停止するには Ctrl+C を押してください"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '停止しました'" EXIT

wait
