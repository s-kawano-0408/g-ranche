# Claude AI 統合ガイド

## 1. 使っているAnthropicの機能

| 機能 | 実装箇所 | 説明 |
|------|----------|------|
| Streaming | `ai/client.py` | リアルタイムでテキストを流す |
| Tool Use | `ai/tools.py`, `ai/tool_executor.py` | ClaudeにDBを操作させる |
| Prompt Caching | `ai/system_prompt.py` | APIコスト削減 |
| Multi-turn | `routers/ai.py` | 会話履歴をDBに保存 |

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

### ツールの定義（ai/tools.py）

```python
{
    "name": "search_clients",
    "description": "利用者を名前、障害種別、状態で検索します",
    # ↑ Claudeはこの description を読んで「いつ使うか」を判断する
    # description が不明確だと正しく使われない
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "利用者の名前（部分一致）",
            },
        },
        "required": [],   # 必須パラメータ。空なら全部任意
    },
}
```

### ツールの実行（ai/tool_executor.py）

```python
def _search_clients(self, name=None, disability_type=None, status="active"):
    stmt = select(Client)
    if name:
        stmt = stmt.where(Client.name.contains(name))
    clients = self.db.execute(stmt).scalars().all()

    # 必ずJSON化できる形式で返す
    return {
        "clients": [self._client_to_dict(c) for c in clients],
        "total": len(clients),
    }
```

**重要：** 戻り値は必ず `dict` や `list` など JSON化できる型にする。
`datetime` オブジェクトなどはそのまま返せないので `.isoformat()` に変換する。

---

## 3. 新しいツールを追加する手順

例：「利用者の誕生日が近い人を検索する」ツールを追加する場合

### Step 1: ai/tools.py にツール定義を追加

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

### Step 2: ai/tool_executor.py にメソッドを追加

```python
class ToolExecutor:
    def __init__(self, db):
        self.db = db

    def execute(self, tool_name, tool_input):
        tool_map = {
            # ... 既存のツール ...
            "get_birthday_clients": self._get_birthday_clients,  # ← 追加
        }
        handler = tool_map.get(tool_name)
        return handler(**tool_input)

    def _get_birthday_clients(self, days_ahead=30):
        from datetime import date
        today = date.today()
        # 誕生日の月日だけで比較するロジックを書く
        clients = self.db.execute(select(Client).where(...)).scalars().all()
        return {
            "clients": [{"id": c.id, "name": c.name, "birth_date": str(c.birth_date)} for c in clients],
            "total": len(clients),
        }
```

### Step 3: フロントエンドのToolCallIndicatorに日本語名を追加

```typescript
// components/ai/ToolCallIndicator.tsx
const TOOL_NAMES: Record<string, string> = {
  // ... 既存 ...
  'get_birthday_clients': '誕生日が近い利用者を確認',  // ← 追加
}
```

---

## 4. SSEストリーミングの実装詳細

### バックエンド（routers/ai.py）

```python
@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):

    async def generate():
        async for event in ai_client.stream_chat(messages, tool_executor):
            # event は {"type": "text", "content": "..."} のような dict
            yield f"data: {json.dumps(event)}\n\n"  # SSEフォーマット

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",  # ← SSEに必須
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginxのバッファリングを無効化
        },
    )
```

### フロントエンド（hooks/useAIStream.ts）

```typescript
// SSEを受信して解析する
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
      case 'text':
        // アシスタントメッセージに追記
        break
      case 'tool_call':
        // ツール実行中を表示
        break
      case 'tool_result':
        // ツール結果を表示
        break
      case 'done':
        // 完了
        break
    }
  }
}
```

---

## 5. システムプロンプトの編集

`ai/system_prompt.py` の `system_text` を編集します。

```python
system_text = """あなたは福祉支援管理システムの専門AIアシスタントです。

## あなたの専門領域
... ここを編集 ...

## 利用可能なツール
... ツールを追加したらここにも説明を追加 ...
"""
```

**Prompt Cachingについて：**
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

## 6. 文書生成エンドポイント

### /api/ai/generate-plan（支援計画書生成）

```python
# routers/ai.py
@router.post("/generate-plan")
async def generate_plan(request: GeneratePlanRequest, db: Session = Depends(get_db)):
    client_info = { ... }   # DBから利用者情報を取得
    plan_text = ai_client.generate_plan(client_info, request.additional_info)
    return {"plan": plan_text}
```

```python
# ai/client.py
def generate_plan(self, client_info: dict, additional_info: str = None) -> str:
    prompt = f"""以下の利用者情報を基に、サービス等利用計画書を作成してください。

{json.dumps(client_info, ensure_ascii=False, indent=2)}

Markdown形式で作成してください。"""

    response = self.client.messages.create(
        model=self.model,
        max_tokens=4096,
        system=self.system_prompt,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
```

**プロンプトを改善するには：** `generate_plan()` の `prompt` 変数を編集する。
どんな形式で出力してほしいか、どんな情報を重視してほしいかを追記する。

---

## 7. 会話履歴の管理

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

**注意：** Tool Useを含む会話は `content` が文字列ではなくリストになります。
これはAnthropicの仕様です。

---

## 8. APIコストを抑えるヒント

1. **Prompt Caching** — すでに実装済み。システムプロンプトをキャッシュ
2. **max_tokens** — 必要以上に大きくしない（現在4096）
3. **会話履歴のトリミング** — 長い会話は古いメッセージを削除する（未実装）
   ```python
   # 古いメッセージを削る例
   if len(messages) > 20:
       messages = messages[-20:]  # 最新20件だけ使う
   ```
4. **ストリーミングvs非ストリーミング** — チャットはストリーミング、文書生成は非ストリーミング
