# アーキテクチャ解説

## 全体構成

```
ブラウザ (Next.js)
    ↕  HTTP / SSE
FastAPI (Python)
    ↕  SQLAlchemy
SQLite (g_ranche.db)
    ↕  Anthropic API
Claude (claude-sonnet-4-6)
```

フロントエンドとバックエンドは完全に分離しています。
フロントエンドは `http://localhost:8000` のAPIを叩くだけです。

---

## バックエンド構成

```
backend/
├── main.py             ← FastAPI アプリの入口。ルーターを登録する
├── database.py         ← DB接続設定（SQLAlchemy）
├── models/             ← テーブル定義（Pythonクラス = テーブル）
├── schemas/            ← APIのリクエスト/レスポンス型定義（Pydantic）
├── routers/            ← APIエンドポイントの実装
└── ai/                 ← Claude AIとのやり取り専用
```

### リクエストの流れ（通常のCRUD）

```
ブラウザ
  → POST /api/clients  （JSONを送る）
    → routers/clients.py  （バリデーション・DB操作）
      → models/client.py  （テーブル定義を参照）
        → SQLite  （実際の保存）
          → ClientResponse  （schemas/client.py の型でJSON返却）
```

### リクエストの流れ（AIチャット）

```
ブラウザ
  → POST /api/ai/chat  （メッセージを送る）
    → routers/ai.py  （SSEストリームを開始）
      → ai/client.py  （Claudeにメッセージ送信）
        → Anthropic API  （ストリーミング応答）
          → tool_use ブロックを検出したら...
            → ai/tool_executor.py  （DBを実際にクエリ）
              → Claude に結果を送り返す
                → 最終的な回答をSSEでブラウザに流す
```

---

## フロントエンド構成

```
frontend/src/
├── app/            ← ページ（Next.js App Router）
├── components/     ← 再利用可能なUIパーツ
├── hooks/          ← 状態管理・副作用（useAIStream など）
├── lib/api.ts      ← バックエンドへのHTTPリクエスト関数
└── types/index.ts  ← TypeScript型定義
```

### ページとコンポーネントの関係

```
app/ai/page.tsx  （AIページ）
  → hooks/useAIStream.ts  （SSE通信・状態管理）
  → components/ai/ChatMessage.tsx  （メッセージ表示）
  → components/ai/ToolCallIndicator.tsx  （ツール実行中表示）
  → components/ai/DocumentPanel.tsx  （文書生成パネル）
  → lib/api.ts  （streamAIChat関数を呼ぶ）
```

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
     | <-- data: {"type":"tool_call"} | <- tool_use block |
     |                             | execute tool (DB)    |
     | <-- data: {"type":"tool_result"} |                 |
     |                             | messages.stream() -> |（再度Claude呼び出し）
     | <-- data: {"type":"text"}   | <-- text_delta       |
     | <-- data: {"type":"done"}   | <-- end_turn         |
```

---

## 重要な設計判断

### なぜSQLiteか
- 単一ファイル（`g_ranche.db`）で完結する
- 自営業者1人〜数人規模なら十分
- PostgreSQLに移行したければ `DATABASE_URL` を変えるだけ

### なぜSSEか（WebSocketではなく）
- 一方向（サーバー→ブラウザ）の通信で十分
- HTTPで動くので設定が簡単
- Claudeのストリーミングと相性が良い

### Prompt Cachingとは
- Claudeのシステムプロンプトは毎回同じ内容
- `cache_control: {"type": "ephemeral"}` をつけると、Anthropicがプロンプトをキャッシュ
- 2回目以降のAPIコールが安くなる（トークン数が多いほど効果大）
