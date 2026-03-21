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
- **Backend**: Python + FastAPI + SQLAlchemy + SQLite（ローカル）/ PostgreSQL（本番）
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui + SWR
- **AI**: Anthropic Python SDK (claude-sonnet-4-6) + Streaming + Tool Use + Prompt Caching
- **デプロイ**: Docker Compose + Caddy（自動HTTPS）on Oracle Cloud VM

## プロジェクト構成
```
g-ranche/
├── start.sh                 # 一括起動スクリプト（ローカル開発用）
├── docker-compose.yml       # 本番デプロイ用（4サービス: db, backend, frontend, caddy）
├── Caddyfile                # リバースプロキシ + 自動HTTPS設定（Oracle用）
├── fly.toml                 # Fly.ioデプロイ設定
├── Dockerfile.fly           # Fly.io用Dockerfile（Python + Node.js + Caddy）
├── Caddyfile.fly            # Fly.io用Caddy設定（:8080でリバースプロキシ）
├── start-fly.sh             # Fly.io用起動スクリプト
├── .env.production          # 本番環境変数テンプレート（※Git管理外）
├── backend/
│   ├── main.py              # FastAPI エントリポイント
│   ├── database.py          # DB接続セットアップ（SQLite/PostgreSQL自動切替）
│   ├── Dockerfile           # バックエンドのDockerイメージ定義
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
    ├── Dockerfile           # フロントエンドのDockerイメージ定義
    └── src/
        ├── app/             # Next.js App Router ページ
        │   ├── dashboard/   # ダッシュボード
        │   ├── clients/     # 利用者管理（一覧・詳細）
        │   ├── monthly-tasks/ # 月間業務管理
        │   ├── schedules/   # スケジュール
        │   ├── records/     # 支援記録
        │   └── ai/          # AIアシスタント
        ├── middleware.ts     # nonceベースCSPヘッダー生成
        ├── contexts/        # Reactコンテキスト
        │   ├── AuthContext.tsx      # 認証状態管理（Cookie + 暗号鍵 + 自動ロック）
        │   └── PseudonymContext.tsx # 仮名化マッピング管理（IndexedDB + AES暗号化）
        ├── components/      # UIコンポーネント
        │   ├── clients/ClientCombobox.tsx # 検索可能な利用者選択（共通コンポーネント）
        │   └── layout/      # Sidebar, Header
        ├── hooks/           # カスタムフック
        │   ├── useAIStream.ts      # AIストリーミング
        │   └── useAutoLock.ts      # 自動ロック（30分無操作でログアウト）
        ├── lib/             # ユーティリティ
        │   ├── api.ts              # APIクライアント（credentials: include）
        │   ├── crypto.ts           # AES-GCM暗号化・PBKDF2鍵導出
        │   ├── indexeddb.ts        # IndexedDBラッパー
        │   └── migrate-storage.ts  # localStorage → IndexedDB移行
        └── types/           # TypeScript型定義
```

## API エンドポイント
- `GET/POST /api/clients` - 利用者一覧・新規作成
- `GET/PUT/DELETE /api/clients/{id}` - 利用者詳細・更新（管理者のみ、certificate_number/birth_date変更時はハッシュ再計算）・削除
- `GET/POST /api/support-plans` - 支援計画
- `GET/POST/PUT /api/records` - 支援記録
- `GET/POST/PUT /api/schedules` - スケジュール
- `GET /api/schedules/today` - 本日の予定
- `GET /api/monthly-tasks` - 月間業務タスク一覧（year, month, client_id でフィルタ可）
- `PUT /api/monthly-tasks` - 月間業務タスク登録・更新（upsert）
- `DELETE /api/monthly-tasks` - 月間業務タスク削除（client_id, year, month 指定）
- `POST /api/auth/login` - ログイン（HttpOnly Cookie をセット）
- `POST /api/auth/logout` - ログアウト（Cookie を削除）
- `GET /api/auth/me` - ログイン中のユーザー情報取得
- `GET /api/auth/users` - ユーザー一覧（管理者のみ）
- `PUT /api/auth/users/{id}/password` - パスワード変更（管理者のみ）
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
- フィルター: ステータス（利用中/利用終了/すべて、デフォルト: 利用中）、児/者、五十音
- 年表示クリックで今年に戻る
- DB: `monthly_tasks` テーブル（client_id + year + month でユニーク制約）
- タスク種別ごとに色分け表示

## Claude AI 機能
- **Tool Use**: 8ツール（利用者検索・スケジュール作成・記録作成など）
- **Streaming**: SSEによるリアルタイム表示
- **Prompt Caching**: システムプロンプトをキャッシュしてコスト削減
- **Multi-turn**: `ai_conversations`テーブルで会話履歴を永続化

## データベース (SQLite / PostgreSQL)
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

## 認証・セキュリティ

### 認証方式
- JWT（JSON Web Token）を **HttpOnly Cookie** で管理
- ログイン時にサーバーが Cookie をセット → ブラウザが自動送信
- JavaScript から Cookie にアクセスできない（XSS でトークン窃取不可）
- Cookie 設定: `httponly=True`, `samesite=lax`, `secure=環境依存`（本番は `True`）
- トークン有効期限: 8時間

### 暗号化（個人情報保護）
- マッピングデータは **IndexedDB + AES-256-GCM** で暗号化保存
- 暗号鍵はログインパスワードから **PBKDF2**（10万回反復）で導出
- 鍵は **IndexedDB に永続化**（`CryptoKey` オブジェクト、`extractable: false` でエクスポート不可）
- salt はユーザーごとにランダム生成、IndexedDB に保存
- IV（初期化ベクトル）は暗号化のたびにランダム生成
- ライブラリ: Web Crypto API（ブラウザ標準）

### セキュリティヘッダー
- **CSP**（`middleware.ts`で設定）:
  - ローカル/本番共通: `default-src 'self'`, `connect-src 'self'`, `img-src 'self' data: blob:`
  - デモ環境（Fly.io）: `script-src 'self' 'unsafe-inline' 'unsafe-eval'`（Next.js本番ビルドとの互換性のため緩和中）
  - 本番環境（Oracle移行時）: nonce ベースに戻す予定
- **X-Frame-Options**: DENY（クリックジャッキング防止）
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin

### 自動ロック
- 30分間操作がなければ自動ログアウト（`useAutoLock` フック）
- マウス/キーボード/タッチ操作でタイマーリセット

### CORS
- `ALLOWED_ORIGINS` 環境変数で制御（デフォルト: `http://localhost:3000`）
- `credentials: include` を使うため、ワイルドカード `*` は使用不可

### 既知の制約
- **パスワード変更**: 暗号鍵が変わるため、変更後にマッピングの再インポートが必要
- 本番デプロイ時は `ENVIRONMENT=production` を設定すること（Cookie の `secure` フラグ）

## 仮名化（個人情報保護）
DBに個人情報を保存せず、ハッシュ値のみ保存する仕組み。

### 仕組み
- `certificate_number + birth_date` → SHA-256 → 16文字ハッシュ
- 個人情報はブラウザの **IndexedDB**（AES-GCM暗号化）+ JSONファイルでローカル管理
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

### マイグレーション（localStorage → IndexedDB）
- 初回ログイン時に自動実行（`migrate-storage.ts`）
- localStorage の平文データを暗号化して IndexedDB に保存 → localStorage から削除

## デプロイ

### デモ環境（Fly.io）
- URL: https://g-ranche.fly.dev/
- 構成: 単一コンテナ（Python + Node.js + Caddy）on Fly.io
- DB: SQLite（Fly.io Volume `/data/g_ranche.db`）
- リバースプロキシ: Caddy（`:8080` → `/api/*` はバックエンド、それ以外はNext.js）

#### デプロイ手順
```bash
cd /Users/kawano/project/g-ranche
fly deploy                    # 通常デプロイ
fly deploy --no-cache         # キャッシュなし再ビルド（フロント変更時に推奨）
```

#### DB再作成（seedデータ再投入）
```bash
fly ssh console --app g-ranche -C "rm -f /data/g_ranche.db"
fly deploy --no-cache
# 起動時に自動で seed.py が実行される
# マッピングJSONは https://g-ranche.fly.dev/seed_pseudonym_mapping.json からDL
```

#### 関連ファイル
- `fly.toml` — Fly.io設定（リージョン: nrt、VM: shared-cpu-1x 512MB）
- `Dockerfile.fly` — マルチステージビルド（Node.js 20 + Python 3.11 + Caddy）
- `Caddyfile.fly` — リバースプロキシ設定
- `start-fly.sh` — コンテナ起動スクリプト（backend + frontend + Caddy）

#### API URL設計の注意
- `redirect_slashes=False`（`main.py`）で、FastAPIの自動リダイレクトを無効化
- フロントのAPI URLはバックエンドのルート定義に正確に合わせること
  - コレクション（`"/"`定義）: `/api/clients/`（末尾スラッシュあり）
  - 個別エンドポイント（`"/login"`等）: `/api/auth/login`（末尾スラッシュなし）
- 理由: Caddy経由だとFastAPIのリダイレクトが`http://`で生成され、CSPにブロックされるため

### 本番環境（Oracle Cloud — 予定）
- Oracle Cloud VM（ARM, 1 OCPU, 6GB RAM）上で Docker Compose を使用
- Caddy がリバースプロキシ + 自動HTTPS（Let's Encrypt）
- PostgreSQL でデータ永続化（`./pgdata/`）

#### デプロイ手順
```bash
# VM上で実行
git pull
docker compose --env-file .env.production up -d --build
```

### Gitブランチ戦略
- `main` — 本番（デプロイ対象）
- `develop` — 開発（ローカルで作業するブランチ）
- 開発完了 → `main` にマージ → デプロイ

## 注意事項
- `.env`ファイルに`ANTHROPIC_API_KEY`を設定すること
- ローカル開発時のデータベースファイル: `backend/g_ranche.db`（SQLite）
- 本番は PostgreSQL（`DATABASE_URL` 環境変数で切替）
- CORSは環境変数 `ALLOWED_ORIGINS` で制御（デフォルト: `http://localhost:3000`、ワイルドカード `*` は不可）
- 本番環境では `ENVIRONMENT=production` を設定（Cookie の secure フラグ用）
- `seed.py` 実行時に `seed_pseudonym_mapping.json` が出力される（フロントでインポートして使用）
- `seed.py` は200名の利用者 + 支援計画 + 支援記録 + スケジュール + 月間業務を生成
- `.env.production` と `pgdata/` は `.gitignore` でGit管理外
