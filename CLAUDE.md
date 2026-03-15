# ぐ・らんちぇ 管理システム

ぐ・らんちぇ（相談支援事業所）の業務管理Webアプリ。

## 起動方法

### 一括起動（推奨）
```bash
cd /Users/kawano/project/g-ranche
bash start.sh
```
- バックエンド: http://localhost:8000
- フロントエンド: http://localhost:3000
- API ドキュメント: http://localhost:8000/docs
- 停止: `Ctrl+C`

### 個別起動

#### バックエンド
```bash
cd /Users/kawano/project/g-ranche/backend
~/.local/bin/uv sync                          # 依存パッケージ同期
~/.local/bin/uv run python seed.py            # サンプルデータ投入（初回のみ）
~/.local/bin/uv run python -m uvicorn main:app --reload --port 8000
```
※ `uv run uvicorn ...` はuvicornバイナリが見つからずエラーになるため、必ず `python -m uvicorn` を使うこと

#### フロントエンド
```bash
cd /Users/kawano/project/g-ranche/frontend
npm install                                   # 依存パッケージインストール（初回のみ）
npm run dev
```

#### 初回セットアップ
```bash
cd /Users/kawano/project/g-ranche/backend
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env    # APIキーを設定
```

### トラブルシューティング
- **ポートが既に使用中**: `lsof -ti:3000,8000 | xargs kill -9` で既存プロセスを停止
- **Next.js ロックエラー**: `rm -f frontend/.next/dev/lock` でロックファイルを削除
- **uv が見つからない**: フルパス `~/.local/bin/uv` を使う

## 技術スタック
- **Backend**: Python + FastAPI + SQLAlchemy + SQLite
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui
- **AI**: Anthropic Python SDK (claude-sonnet-4-6) + Streaming + Tool Use + Prompt Caching

## プロジェクト構成
```
g-ranche/
├── start.sh                 # 一括起動スクリプト
├── backend/
│   ├── main.py              # FastAPI エントリポイント
│   ├── database.py          # SQLite + SQLAlchemy セットアップ
│   ├── seed.py              # サンプルデータ（スタッフ2名・利用者5名・計画・記録・スケジュール）
│   ├── pseudonym.py         # 仮名化ハッシュ生成ユーティリティ
│   ├── migrate_pseudonym.py # 既存DBの仮名化マイグレーション
│   ├── models/              # SQLAlchemy テーブル定義
│   │   ├── client.py        # 利用者
│   │   ├── staff.py         # スタッフ
│   │   ├── support_plan.py  # 支援計画
│   │   ├── case_record.py   # 支援記録
│   │   ├── schedule.py      # スケジュール
│   │   ├── monthly_task.py  # 月間業務タスク
│   │   └── ai_conversation.py # AI会話履歴
│   ├── schemas/             # Pydantic スキーマ
│   ├── routers/             # API ルーター
│   │   ├── clients.py       # 利用者CRUD
│   │   ├── support_plans.py # 支援計画
│   │   ├── case_records.py  # 支援記録
│   │   ├── schedules.py     # スケジュール
│   │   ├── monthly_tasks.py # 月間業務管理
│   │   └── ai.py            # AIチャット・文書生成
│   └── ai/                  # AI ロジック
│       ├── client.py        # Anthropic クライアント + ストリーミング + Tool Use ループ
│       ├── tools.py         # 8つのツール定義
│       ├── tool_executor.py # ツール実行（DB操作）
│       └── system_prompt.py # システムプロンプト（Prompt Caching対応）
└── frontend/
    └── src/
        ├── app/             # Next.js App Router ページ
        │   ├── dashboard/   # ダッシュボード
        │   ├── clients/     # 利用者管理（一覧・詳細）
        │   ├── monthly-tasks/ # 月間業務管理
        │   ├── schedules/   # スケジュール
        │   ├── records/     # 支援記録
        │   └── ai/          # AIアシスタント
        ├── contexts/        # Reactコンテキスト
        │   ├── AuthContext.tsx      # 認証状態管理
        │   └── PseudonymContext.tsx # 仮名化マッピング管理
        ├── components/      # UIコンポーネント
        │   └── layout/      # Sidebar, Header
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
- `GET /api/monthly-tasks` - 月間業務タスク一覧（year, month, client_id でフィルタ可）
- `PUT /api/monthly-tasks` - 月間業務タスク登録・更新（upsert）
- `DELETE /api/monthly-tasks` - 月間業務タスク削除（client_id, year, month 指定）
- `POST /api/ai/chat` - AIチャット（SSEストリーミング + Tool Use）
- `POST /api/ai/generate-plan` - 支援計画書生成
- `POST /api/ai/summarize-record` - 支援記録要約
- `POST /api/ai/generate-report` - モニタリング報告書生成

## 月間業務管理
スプレッドシート風の画面で、利用者ごとに月別のタスクを管理する。
- 行: 利用者（フリガナ・名前）、左側固定列で横スクロール対応
- 列: 12ヶ月分（年の切り替え可能）
- セル: ドロップダウンで選択（モニタ / 更新 / 新規 / 更+モニ / 新+モニ / その他 / 最終モニタ）
- ヘッダー: 月ごとの件数を自動集計
- 年表示クリックで今年に戻る
- DB: `monthly_tasks` テーブル（client_id + year + month でユニーク制約）
- タスク種別ごとに色分け表示

## Claude AI 機能
- **Tool Use**: 8ツール（利用者検索・スケジュール作成・記録作成など）
- **Streaming**: SSEによるリアルタイム表示
- **Prompt Caching**: システムプロンプトをキャッシュしてコスト削減
- **Multi-turn**: `ai_conversations`テーブルで会話履歴を永続化

## データベース (SQLite)
- `staffs` - スタッフ情報
- `clients` - 利用者情報（仮名化済み）
  - pseudonym_hash（仮名化ハッシュ）必須・ユニーク
  - gender（性別）
  - client_type（"児"/"者"）必須
  - staff_id, status（active/inactive）, end_date（終了日＝論理削除）, notes
  - ※ 姓名・フリガナ・生年月日・受給者証番号はDBに保存しない
- `support_plans` - 個別支援計画書
- `case_records` - 支援記録
- `schedules` - スケジュール
- `monthly_tasks` - 月間業務タスク（client_id, year, month, task_type）
- `ai_conversations` - AIチャット履歴

## 仮名化（個人情報保護）
DBに個人情報を保存せず、ハッシュ値のみ保存する仕組み。

### 仕組み
- `certificate_number + birth_date` → SHA-256 → 16文字ハッシュ
- 個人情報はブラウザの `localStorage` + JSONファイルでローカル管理
- ハッシュは決定的（同じ入力なら同じ結果）なので、JSONを紛失しても受給者証番号+生年月日から復元可能

### JSONマッピングファイル
- 新規登録時に自動ダウンロード
- 設定ページからインポート/エクスポート/復元が可能
- マッピングがない利用者は「仮名利用者」と表示される

### マイグレーション（既存DB → 仮名化）
```bash
cd backend
~/.local/bin/uv run python migrate_pseudonym.py
```
- 既存の個人情報をJSONに退避してDBから削除
- 出力された `pseudonym_mapping.json` を安全に保管すること

## 注意事項
- `.env`ファイルに`ANTHROPIC_API_KEY`を設定すること
- データベースファイル: `backend/g_ranche.db`
- 開発時はCORSを全許可（本番環境では要変更）
- `seed.py` 実行時に `seed_pseudonym_mapping.json` が出力される（フロントでインポートして使用）
