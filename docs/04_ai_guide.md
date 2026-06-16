# Claude AI 統合ガイド

## 1. 使っているAnthropicの機能

| 機能 | 実装箇所 | 説明 |
|------|----------|------|
| Streaming | `ai/client.py` | リアルタイムでテキストを流す |
| Tool Use | `ai/tools.py`, `ai/tool_executor.py` | ClaudeにDBを操作させる |
| Prompt Caching | `ai/system_prompt.py` | APIコスト削減 |
| Multi-turn | `routers/ai.py` | 会話履歴を `ai_conversations` テーブルに保存 |
| Vision | `transcription/ocr.py` | 画像から直接フィールド抽出 |

モデル: `claude-sonnet-4-6`（`ai/client.py` と `transcription/ocr.py` の `MODEL` 定数で管理）

---

## 2. Tool Use の仕組み

### 流れ

```
1. ユーザー: 「田中さんの情報を見せて」
                ↓
2. Claude: "search_clients" ツールを使うべきと判断
           → {"name": "田中"} という引数でリクエスト
                ↓
3. バックエンド: DBを検索して結果を返す
                ↓
4. Claude: 結果を受け取って日本語で回答を生成
```

### 利用可能なツール一覧（`ai/tools.py`）

| ツール名 | 用途 |
|----------|------|
| `search_clients` | 利用者を名前・障害種別・状態で検索 |
| `get_client_detail` | 利用者の詳細（支援計画・直近5件の支援記録を含む） |
| `get_schedules` | 日付範囲・利用者・種別でスケジュールを検索 |
| `get_case_records` | 利用者・記録種別で支援記録を検索 |
| `create_schedule` | スケジュールを新規作成 |
| `create_case_record` | 支援記録を新規作成 |
| `get_monitoring_due_clients` | モニタリング期日が近い利用者を取得 |
| `get_dashboard_stats` | ダッシュボード統計（利用者数・本日のスケジュールなど） |

### ツール定義の書き方（`ai/tools.py`）

```python
{
    "name": "search_clients",
    "description": "利用者を名前、障害種別、状態で検索します",
    # ↑ Claudeはこの description を読んで「いつ使うか」を判断する
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "利用者の名前（部分一致で検索）",
            },
        },
        "required": [],   # 必須パラメータ。空なら全部任意
    },
}
```

### ツールの実行（`ai/tool_executor.py`）

```python
class ToolExecutor:
    def __init__(self, db):
        self.db = db

    def execute(self, tool_name, tool_input):
        tool_map = {
            "search_clients": self._search_clients,
            "get_client_detail": self._get_client_detail,
            # ...
        }
        handler = tool_map.get(tool_name)
        if not handler:
            return {"error": f"Unknown tool: {tool_name}"}
        try:
            return handler(**tool_input)
        except Exception as e:
            return {"error": str(e)}

    def _search_clients(self, name=None, client_type=None, status="active"):
        stmt = select(Client).where(Client.deleted_at.is_(None))  # 論理削除済みを除外
        if name:
            pattern = f"%{name}%"
            stmt = stmt.where(
                or_(
                    Client.family_name.ilike(pattern),
                    Client.given_name.ilike(pattern),
                    Client.family_name_kana.ilike(pattern),
                    Client.given_name_kana.ilike(pattern),
                )
            )
        if client_type:
            stmt = stmt.where(Client.client_type == client_type)
        if status:
            stmt = stmt.where(Client.status == status)
        clients = self.db.execute(stmt).scalars().all()
        return {
            "clients": [self._client_to_dict(c) for c in clients],
            "total": len(clients),
        }
```

**重要：** 戻り値は必ず `dict` や `list` など JSON 化できる型にする。
`date` / `datetime` は `_format_date()` ヘルパーで ISO 文字列に変換する（`tool_executor.py` の `_client_to_dict` 参照）。

---

## 3. 新しいツールを追加する手順

### Step 1: `ai/tools.py` にツール定義を追加

```python
def get_tools():
    return [
        # ... 既存のツール ...
        {
            "name": "get_birthday_clients",
            "description": "誕生日が近い利用者を検索します。お祝いや連絡のタイミングに使えます。",
            "input_schema": {
                "type": "object",
                "properties": {
                    "days_ahead": {
                        "type": "integer",
                        "description": "何日以内に誕生日が来る利用者を検索するか（デフォルト：30）",
                        "default": 30,
                    },
                },
                "required": [],
            },
        },
    ]
```

### Step 2: `ai/tool_executor.py` の `tool_map` とハンドラを追加

```python
def execute(self, tool_name, tool_input):
    tool_map = {
        # ... 既存のツール ...
        "get_birthday_clients": self._get_birthday_clients,
    }
    # ...

def _get_birthday_clients(self, days_ahead=30):
    today = date.today()
    clients = self.db.execute(select(Client).where(...)).scalars().all()
    return {
        "clients": [{"id": c.id, "name": f"{c.family_name} {c.given_name}"} for c in clients],
        "total": len(clients),
    }
```

### Step 3: `ai/system_prompt.py` の「利用可能なツール」一覧に説明を追記

Claude にツールの存在を強調するため、システムプロンプトの末尾の箇条書きにも追加します。

### Step 4: フロントエンドの ToolCallIndicator に日本語名を追加

```typescript
// components/ai/ToolCallIndicator.tsx
const TOOL_NAMES: Record<string, string> = {
  // ... 既存 ...
  'get_birthday_clients': '誕生日が近い利用者を確認',
}
```

---

## 4. SSEストリーミングの実装詳細

### バックエンド（`routers/ai.py` + `ai/client.py`）

```python
@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db), _user=Depends(get_current_user)):
    # 1. 会話履歴を ai_conversations からロード（無ければ新規作成）
    # 2. user メッセージを履歴に追加（client_id があれば「現在参照中の利用者」コンテキストを前置）
    async def generate():
        ai_client = get_ai_client()
        tool_executor = ToolExecutor(db)
        async for event in ai_client.stream_chat(current_messages, tool_executor):
            yield await sse_event(event)
        # 3. 終了後、最終 messages を ai_conversations.messages に保存

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # リバースプロキシのバッファリングを無効化
        },
    )
```

`ai_client.stream_chat()` は内部で **Tool Use ループ** を回し、`stop_reason == "end_turn"` か `tool_use` ブロックがなくなるまで Claude を再呼び出しします。各段階で以下のイベントを yield します:

| event.type | 意味 |
|------------|------|
| `text` | テキストの差分（`delta.text`） |
| `tool_call_start` | tool_use ブロックの開始（name, id） |
| `tool_call` | input が確定したツール呼び出し |
| `tool_result` | ツール実行結果 |
| `done` | 全体完了 |
| `error` | エラー（catch-all） |

### フロントエンド（`hooks/useAIStream.ts`）

```typescript
const reader = response.body.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''  // 不完全な行はバッファに残す

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const data = JSON.parse(line.slice(6))  // "data: " を除いてパース

    switch (data.type) {
      case 'text': /* アシスタントメッセージに追記 */ break
      case 'tool_call_start': /* ツールアイコンを表示 */ break
      case 'tool_call': /* 入力を表示 */ break
      case 'tool_result': /* 結果を表示 */ break
      case 'done': /* 完了 */ break
      case 'error': /* エラー表示 */ break
    }
  }
}
```

---

## 5. システムプロンプトの編集

`ai/system_prompt.py` の `system_text` を編集します。

```python
system_text = """あなたは福祉支援管理システムの専門AIアシスタントです。...

## あなたの専門領域
... ここを編集 ...

## 利用可能なツール
... ツールを追加したらここにも説明を追加 ...
"""
```

**Prompt Caching について：**
```python
return [
    {
        "type": "text",
        "text": system_text,
        "cache_control": {"type": "ephemeral"},  # ← これがキャッシュを有効化
    }
]
```
システムプロンプトが長いほどキャッシュの効果が大きい。
`cache_control` を外すとキャッシュが無効になり、毎回課金される。

---

## 6. 環境変数フラグによるオン/オフ制御

AI機能とExcel転記機能は環境変数フラグで有効/無効を切り替えられます（`main.py`）。

```python
def _env_flag(name: str) -> bool:
    return os.getenv(name, "false").lower() in ("1", "true", "yes")

ENABLE_AI = _env_flag("ENABLE_AI")
ENABLE_TRANSCRIPTION = _env_flag("ENABLE_TRANSCRIPTION")

if ENABLE_AI:
    app.include_router(ai.router, prefix="/api/ai", ...)
if ENABLE_TRANSCRIPTION:
    app.include_router(transcription.router, prefix="/api/transcription", ...)
```

- フラグが `false`（デフォルト）のとき、該当するAPIルーターが登録されない → エンドポイントが存在しない状態になる
- ローカル開発: `.env` に `ENABLE_AI=true` / `ENABLE_TRANSCRIPTION=true` を追加
- 本番（Fly.io）: `fly secrets set ENABLE_AI=false` のように管理

---

## 7. 文書生成エンドポイント

すべて `routers/ai.py` 内で実装。非ストリーミングで動作し、`get_current_user` で認証必須。

| エンドポイント | 用途 | 入力 | 出力 |
|----------------|------|------|------|
| `POST /api/ai/generate-plan` | サービス等利用計画書を生成 | `client_id`, `additional_info?` | `{plan, client_id}` |
| `POST /api/ai/summarize-record` | 支援記録を要約（200文字以内） | `record_id` or `content` | `{summary, record_id}` |
| `POST /api/ai/generate-report` | モニタリング報告書を生成 | `client_id`, `period_start?`, `period_end?`, `additional_notes?` | `{report, client_id}` |

```python
# ai/client.py 抜粋
def generate_plan(self, client_info: dict, additional_info: str = None) -> str:
    prompt = f"""以下の利用者情報を基に、サービス等利用計画書を作成してください。

## 利用者情報
{json.dumps(client_info, ensure_ascii=False, indent=2)}

## 作成する計画書の内容
1. 利用者の意向・希望
2. 総合的な支援の方針
3. 長期目標（1〜2年）
4. 短期目標（3〜6ヶ月）
5. 必要なサービスと支援内容
6. モニタリング計画

Markdown形式で作成してください。"""

    response = self.client.messages.create(
        model=self.model,
        max_tokens=4096,
        system=self.system_prompt,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
```

**プロンプトを改善するには：** 該当する `generate_plan` / `summarize_record` / `generate_report` の `prompt` 変数を編集する。

---

## 8. 会話履歴の管理

会話履歴は `ai_conversations` テーブルの `messages` カラム（JSON）に保存されます。

```python
# 形式
messages = [
    {"role": "user", "content": "田中さんの情報を見せて"},
    {"role": "assistant", "content": [
        {"type": "text", "text": "田中さんの情報です..."},
        {"type": "tool_use", "id": "xxx", "name": "search_clients", "input": {"name": "田中"}},
    ]},
    {"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": "xxx", "content": "..."},
    ]},
    {"role": "assistant", "content": "田中太郎さん（45歳）の情報です..."},
]
```

**注意：** Tool Use を含む会話は `content` が文字列ではなくリストになります。Anthropic の仕様です。

セッションは `session_id` で識別し、`POST /api/ai/chat` の度に同じ `session_id` を送ると履歴が引き継がれます。

---

## 9. Excel 転記での Vision API 利用

OCR は `transcription/ocr.py` で実装され、`/api/transcription/ocr` から呼ばれます。

- 画像を base64 で送信し、`transcription/cell_mappings.py` の `EXTRACTION_PROMPTS[sheet_name]` をプロンプトとして渡す
- 1 回の API 呼び出しで OCR + フィールド構造化を完結（中間 OCR テキストを介さない）
- 戻り値の `field_name` を `CELL_MAPPINGS` で検証 → ホワイトリスト外は破棄

フロントは `frontend/src/app/api/transcription/ocr/route.ts` を経由（90 秒タイムアウトを与えるため）。

---

## 10. APIコストを抑えるヒント

1. **Prompt Caching** — すでに実装済み。システムプロンプトをキャッシュ
2. **max_tokens** — 必要以上に大きくしない（チャット/計画書/報告書は 4096、要約は 512）
3. **会話履歴のトリミング** — 長い会話は古いメッセージを削除する（未実装）
   ```python
   if len(messages) > 20:
       messages = messages[-20:]
   ```
4. **ストリーミング vs 非ストリーミング** — チャットはストリーミング、文書生成は非ストリーミング
