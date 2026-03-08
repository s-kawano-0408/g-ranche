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

---

## よく使うコマンド

```bash
# バックエンド起動
cd backend
export PATH="$HOME/.local/bin:$PATH"
uv run uvicorn main:app --reload --port 8000

# フロントエンド起動
cd frontend
npm run dev

# サンプルデータ投入（初回のみ）
cd backend
uv run python seed.py

# 依存パッケージ追加（バックエンド）
cd backend
uv add パッケージ名

# 依存パッケージ追加（フロントエンド）
cd frontend
npm install パッケージ名

# shadcn/ui コンポーネント追加
cd frontend
npx shadcn@latest add コンポーネント名

# API仕様書を見る（ブラウザで開く）
open http://localhost:8000/docs
```

---

## ファイルを探すときの目安

| やりたいこと | 見るファイル |
|-------------|-------------|
| テーブル構造を変更 | `backend/models/*.py` |
| APIのリクエスト/レスポンス型を変更 | `backend/schemas/*.py` |
| APIのロジックを変更 | `backend/routers/*.py` |
| AIツールを追加 | `backend/ai/tools.py` + `backend/ai/tool_executor.py` |
| AIの性格・知識を変更 | `backend/ai/system_prompt.py` |
| ページのUIを変更 | `frontend/src/app/*/page.tsx` |
| 共通コンポーネントを変更 | `frontend/src/components/**/*.tsx` |
| APIを呼ぶ関数を変更 | `frontend/src/lib/api.ts` |
| TypeScriptの型を変更 | `frontend/src/types/index.ts` |
| サンプルデータを変更 | `backend/seed.py` |
