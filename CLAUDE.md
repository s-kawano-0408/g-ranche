# ぐ・らんちぇ 管理システム

ぐ・らんちぇ（相談支援事業所）の業務管理Webアプリ。
詳細ドキュメントは `docs/` フォルダを参照。

## 起動
```bash
bash start.sh
```
- バックエンド: http://localhost:8000
- フロントエンド: http://localhost:3000
- 停止: `Ctrl+C`

## 個別起動
```bash
# バックエンド
cd backend
~/.local/bin/uv run python -m uvicorn main:app --reload --port 8000

# フロントエンド
cd frontend
npm run dev
```

## トラブルシューティング
- **ポートが使用中**: `lsof -ti:3000,8000 | xargs kill -9`
- **Next.js ロックエラー**: `rm -f frontend/.next/dev/lock`
- **uv が見つからない**: フルパス `~/.local/bin/uv` を使う

## 重要な注意事項
- `uv run uvicorn ...` はエラーになる。必ず `python -m uvicorn` を使うこと
- API の末尾スラッシュはバックエンドのルート定義に厳密に合わせること（`docs/02_backend_guide.md` 参照）
- DB は全環境で Supabase PostgreSQL（`DATABASE_URL` 環境変数で接続）
- 論理削除: `users` 以外は `deleted_at` カラムで管理（物理削除しない）
- `ENABLE_AI=true` / `ENABLE_TRANSCRIPTION=true` を `.env` に設定しないと AI・Excel転記のAPIが登録されない（本番はデフォルト `false`）

## ドキュメント（`docs/` フォルダ）
- `00_index.md` — ドキュメント一覧・読み方ガイド
- `01_architecture.md` — システム設計・データの流れ・技術スタック
- `02_backend_guide.md` — バックエンド実装・APIエンドポイント・修正パターン
- `03_frontend_guide.md` — フロントエンド実装・コンポーネント・修正パターン
- `04_ai_guide.md` — Claude AI統合・ツール追加方法
- `05_known_issues.md` — 既知の課題リスト
- `06_git_guide.md` — Gitブランチ戦略・デプロイ手順
- `07_security_decisions.md` — 認証・JWT・セキュリティ設計
- `08_performance_optimization.md` — パフォーマンス最適化の記録
