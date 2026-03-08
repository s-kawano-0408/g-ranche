# ぐ・らんちぇ 管理システム

ぐ・らんちぇ（相談支援事業所）の業務管理Webアプリ。

## 起動方法

### バックエンド
```bash
cd backend
# APIキーを設定（初回のみ）
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

uv sync
uv run python seed.py          # サンプルデータ投入（初回のみ）
uv run uvicorn main:app --reload --port 8000
```

### フロントエンド
```bash
cd frontend
npm install
npm run dev
```

アクセス: http://localhost:3000

## 技術スタック
- **Backend**: Python + FastAPI + SQLAlchemy + SQLite
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **AI**: Anthropic Python SDK (claude-sonnet-4-6) + Streaming + Tool Use + Prompt Caching

## プロジェクト構成
```
g-ranche/
├── backend/
│   ├── main.py              # FastAPI エントリポイント
│   ├── database.py          # SQLite + SQLAlchemy セットアップ
│   ├── seed.py              # サンプルデータ
│   ├── models/              # SQLAlchemy テーブル定義
│   ├── schemas/             # Pydantic スキーマ
│   ├── routers/             # API ルーター（clients/plans/records/schedules/ai）
│   └── ai/                  # AI ロジック
│       ├── client.py        # Anthropic クライアント + ストリーミング + Tool Use ループ
│       ├── tools.py         # 8つのツール定義
│       ├── tool_executor.py # ツール実行（DB操作）
│       └── system_prompt.py # システムプロンプト（Prompt Caching対応）
└── frontend/
    └── src/
        ├── app/             # Next.js App Router ページ
        ├── components/      # UIコンポーネント
        ├── hooks/           # useAIStream など
        ├── lib/api.ts       # APIクライアント
        └── types/           # TypeScript型定義
```

## API エンドポイント
- `GET/POST /api/clients` - 利用者一覧・新規作成
- `GET/PUT/DELETE /api/clients/{id}` - 利用者詳細・更新・削除
- `GET/POST /api/support-plans` - 支援計画
- `GET/POST/PUT /api/records` - 支援記録
- `GET/POST/PUT /api/schedules` - スケジュール
- `GET /api/schedules/today` - 本日の予定
- `POST /api/ai/chat` - AIチャット（SSEストリーミング + Tool Use）
- `POST /api/ai/generate-plan` - 支援計画書生成
- `POST /api/ai/summarize-record` - 支援記録要約
- `POST /api/ai/generate-report` - モニタリング報告書生成

## Claude AI 機能
- **Tool Use**: 8ツール（利用者検索・スケジュール作成・記録作成など）
- **Streaming**: SSEによるリアルタイム表示
- **Prompt Caching**: システムプロンプトをキャッシュしてコスト削減
- **Multi-turn**: `ai_conversations`テーブルで会話履歴を永続化

## データベース (SQLite)
- `staffs` - スタッフ情報
- `clients` - 利用者情報
- `support_plans` - 個別支援計画書
- `case_records` - 支援記録
- `schedules` - スケジュール
- `ai_conversations` - AIチャット履歴

## 注意事項
- `.env`ファイルに`ANTHROPIC_API_KEY`を設定すること
- データベースファイル: `backend/g_ranche.db`
- 開発時はCORSを全許可（本番環境では要変更）
