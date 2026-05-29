# アーキテクチャ解説

## 全体構成

```
ブラウザ (Next.js)
    ↕  HTTP / SSE
FastAPI (Python)
    ↕  SQLAlchemy
PostgreSQL (Supabase)
    ↕  Anthropic API
Claude (claude-sonnet-4-6)
```

フロントエンドとバックエンドは完全に分離しています。
フロントエンドは `http://localhost:8000` のAPIを叩くだけです。

---

## バックエンド構成

```
backend/
├── main.py             ← FastAPI アプリの入口。ルーター登録 + CORS + レートリミット + 監査ログ
├── database.py         ← DB接続設定（SQLAlchemy + PostgreSQL）
├── auth.py             ← JWT認証（ログイン・トークン検証・自動更新・ロール制御）
├── seed.py             ← サンプルデータ投入スクリプト
├── models/             ← テーブル定義（Pythonクラス = テーブル）
├── schemas/            ← APIのリクエスト/レスポンス型定義（Pydantic）
├── routers/            ← APIエンドポイントの実装
├── ai/                 ← Claude AIとのやり取り専用
└── transcription/      ← Excel転記（OCR + セルマッピング + 書き込み）
```

### main.py で動いている横断的処理

- **CORS** — `ALLOWED_ORIGINS` で許可オリジン制御。`credentials: include` のためワイルドカード不可
- **レートリミット** — `slowapi` でログインに 5回/分・30回/時 を適用（IP単位）
- **末尾スラッシュ除去ミドルウェア** — `/api/clients/` を `/api/clients` に書き換え、308 リダイレクトを防止
- **監査ログミドルウェア** — `/api/` 配下のリクエストをすべて `audit` ロガーに `METHOD PATH user=<email> ip=<ip> status=<code>` 形式で記録
- **redirect_slashes=False** — FastAPI 自動リダイレクトを無効化（Caddy 経由で `http://` リダイレクトが生成され CSP にブロックされるのを防ぐ）

### リクエストの流れ（通常のCRUD）

```
ブラウザ
  → POST /api/clients  （JSONを送る + Cookie自動送信）
    → auth.py  （Cookie の JWT を検証 → users テーブルからユーザー取得）
      → routers/clients.py  （バリデーション・DB操作）
        → models/client.py  （テーブル定義を参照）
          → PostgreSQL  （実際の保存）
            → ClientResponse  （schemas/client.py の型でJSON返却）
```

### リクエストの流れ（AIチャット）

```
ブラウザ
  → POST /api/ai/chat  （session_id + message + 任意の client_id）
    → routers/ai.py  （ai_conversations から履歴をロード → SSEストリーム開始）
      → ai/client.py  （Claudeにメッセージ送信）
        → Anthropic API  （ストリーミング応答）
          → tool_use ブロックを検出したら...
            → ai/tool_executor.py  （DBを実際にクエリ）
              → Claude に結果を送り返す
                → 最終的な回答をSSEでブラウザに流す
                  → 完了後、最終 messages を ai_conversations に保存
```

### リクエストの流れ（Excel転記）

```
ブラウザ
  → 画像アップロード（POST /api/transcription/ocr）
    → Next.js Route Handler（app/api/transcription/ocr/route.ts、90秒タイムアウト）
      → FastAPI /api/transcription/ocr
        → transcription/ocr.py  （Claude Vision APIで画像を読み取り + 構造化）
          → フィールド一覧をJSON返却
  → フィールド確認・修正（ブラウザ上で編集）
  → Excel生成（POST /api/transcription/generate）
    → transcription/excel_writer.py  （openpyxlでテンプレートに書き込み）
      → .xlsx バイナリを返却 → ブラウザでダウンロード
```

---

## フロントエンド構成

```
frontend/src/
├── app/            ← ページ（Next.js App Router）
├── components/     ← 再利用可能なUIパーツ
├── contexts/       ← Reactコンテキスト（認証・トースト通知）
├── hooks/          ← カスタムフック（SWRデータ取得・AIストリーミング・自動ロック）
├── lib/            ← APIクライアント・SWR fetcher・ユーティリティ
├── middleware.ts   ← CSPヘッダー生成
└── types/index.ts  ← TypeScript型定義
```

### ページとコンポーネントの関係

```
app/ai/page.tsx  （AIページ）
  → hooks/useAIStream.ts  （SSE通信・状態管理）
  → components/ai/ChatMessage.tsx  （メッセージ表示）
  → components/ai/ToolCallIndicator.tsx  （ツール実行中表示）
  → components/ai/DocumentPanel.tsx  （文書生成パネル、デスクトップのみ表示）
  → lib/api.ts  （streamAIChat関数を呼ぶ）
```

### Next.js のリクエストルーティング

- ローカル開発: `next.config.ts` の `rewrites` で `/api/*` を `http://localhost:8000/api/*` に転送
- 本番（Fly.io）: Caddy が `/api/*` をバックエンドに、それ以外を Next.js にリバースプロキシ
- `skipTrailingSlashRedirect: true` を設定し、308 リダイレクトを抑制

---

## データの流れ：SSEストリーミング

SSE（Server-Sent Events）は、サーバーからブラウザへ一方向にリアルタイムでデータを送る仕組みです。

```
フロントエンド                  バックエンド              Claude
     |                             |                      |
     | POST /api/ai/chat --------> |                      |
     |                             | messages.stream() -> |
     | <-- data: {"type":"text"}   | <-- text_delta       |
     | <-- data: {"type":"text"}   | <-- text_delta       |
     | <-- data: {"type":"tool_call_start"} | <- content_block_start (tool_use) |
     | <-- data: {"type":"tool_call"} | <- 解析完了 |
     |                             | execute tool (DB)    |
     | <-- data: {"type":"tool_result"} |                 |
     |                             | messages.stream() -> |（再度Claude呼び出し）
     | <-- data: {"type":"text"}   | <-- text_delta       |
     | <-- data: {"type":"done"}   | <-- end_turn         |
```

SSE イベント型: `text` / `tool_call_start` / `tool_call` / `tool_result` / `done` / `error`

---

## 重要な設計判断

### なぜPostgreSQL（Supabase）か
- 複数人がクラウドから同時アクセスする（本人・母・弟）
- Supabase の無料枠でTokyoリージョンに配置 → 低遅延
- SQLAlchemy を使っているため、`DATABASE_URL` を変えるだけで接続先を切り替えられる

### `users` と `staffs` を分けている理由
- `users` はログインアカウント（email・password_hash・role）。認証はこちらだけを参照
- `staffs` は業務上の担当者情報（電話番号・所属など）。利用者の担当割当などに使う
- ログインできないが業務に登場するスタッフを表現できるよう分離している

### なぜSSEか（WebSocketではなく）
- 一方向（サーバー→ブラウザ）の通信で十分
- HTTPで動くので設定が簡単
- Claudeのストリーミングと相性が良い

### Prompt Cachingとは
- Claudeのシステムプロンプトは毎回同じ内容
- `cache_control: {"type": "ephemeral"}` をつけると、Anthropicがプロンプトをキャッシュ
- 2回目以降のAPIコールが安くなる（トークン数が多いほど効果大）

### なぜClaude APIでOCRするか
- 福祉書類には氏名・住所・障害情報など要配慮個人情報が含まれる
- Anthropic は「APIデータをモデル訓練に使用しない」と公式に明言
- Google Gemini無料版はAPIの入出力データが学習に使われる可能性がある
