# ドキュメント一覧

## ぐ・らんちぇ 管理システム — 学習・開発ガイド

---

| ファイル | 内容 |
|----------|------|
| [01_architecture.md](./01_architecture.md) | システム全体の設計・データの流れ |
| [02_backend_guide.md](./02_backend_guide.md) | バックエンド実装の解説・修正パターン |
| [03_frontend_guide.md](./03_frontend_guide.md) | フロントエンド実装の解説・修正パターン |
| [04_ai_guide.md](./04_ai_guide.md) | Claude AI統合の仕組み・ツール追加方法 |
| [05_known_issues.md](./05_known_issues.md) | 既知の課題・修正が必要な箇所のリスト |
| [06_git_guide.md](./06_git_guide.md) | Git管理の基本・ブランチ戦略 |
| [07_security_decisions.md](./07_security_decisions.md) | セキュリティ設計の決定事項 |
| [08_performance_optimization.md](./08_performance_optimization.md) | パフォーマンス最適化の記録 |

---

## どこから読むか

### コード全体を理解したい
→ `01_architecture.md` から読む

### バックエンドを修正したい
→ `02_backend_guide.md`

### フロントエンドのUIを修正したい
→ `03_frontend_guide.md`

### AIの挙動を変えたい・ツールを追加したい
→ `04_ai_guide.md`

### 何を直せばいいか知りたい
→ `05_known_issues.md`

### Gitの使い方を知りたい
→ `06_git_guide.md`

### セキュリティの設計判断を確認したい
→ `07_security_decisions.md`

---

## よく使うコマンド

```bash
# 一括起動（推奨）
cd /Users/kawano/project/g-ranche
bash start.sh

# バックエンド起動（個別）
cd backend
~/.local/bin/uv run python -m uvicorn main:app --reload --port 8000

# フロントエンド起動（個別）
cd frontend
npm run dev

# サンプルデータ投入（初回のみ）
cd backend
~/.local/bin/uv run python seed.py

# 依存パッケージ追加（バックエンド）
cd backend
~/.local/bin/uv add パッケージ名

# 依存パッケージ追加（フロントエンド）
cd frontend
npm install パッケージ名

# shadcn/ui コンポーネント追加
cd frontend
npx shadcn@latest add コンポーネント名

# API仕様書を見る（ブラウザで開く）
open http://localhost:8000/docs

# デプロイ（Fly.io）
cd /Users/kawano/project/g-ranche
fly deploy
```

**注意:** `uv run uvicorn ...` はエラーになります。必ず `uv run python -m uvicorn` を使ってください。

---

## ファイルを探すときの目安

| やりたいこと | 見るファイル |
|-------------|-------------|
| テーブル構造を変更 | `backend/models/*.py` |
| APIのリクエスト/レスポンス型を変更 | `backend/schemas/*.py` |
| APIのロジックを変更 | `backend/routers/*.py` |
| AIツールを追加 | `backend/ai/tools.py` + `backend/ai/tool_executor.py` |
| AIの性格・知識を変更 | `backend/ai/system_prompt.py` |
| Excel転記のセルマッピングを変更 | `backend/transcription/cell_mappings.py` |
| ページのUIを変更 | `frontend/src/app/*/page.tsx` |
| 共通コンポーネントを変更 | `frontend/src/components/**/*.tsx` |
| APIを呼ぶ関数を変更 | `frontend/src/lib/api.ts` |
| TypeScriptの型を変更 | `frontend/src/types/index.ts` |
| サンプルデータを変更 | `backend/seed.py` |
| 認証・セッション管理 | `backend/auth.py` + `frontend/src/contexts/AuthContext.tsx` |
