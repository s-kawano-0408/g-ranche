# フロントエンド実装ガイド

## 1. Next.js App Router の基本

`app/` ディレクトリ以下のフォルダ構造がそのままURLになります。

```
app/
├── layout.tsx          → http://localhost:3000/ の共通レイアウト
├── page.tsx            → http://localhost:3000/
├── dashboard/
│   └── page.tsx        → http://localhost:3000/dashboard
├── clients/
│   ├── page.tsx        → http://localhost:3000/clients
│   └── [id]/
│       └── page.tsx    → http://localhost:3000/clients/1  （動的ルート）
```

### Server Component vs Client Component

```tsx
// Server Component（デフォルト）
// → サーバーで実行。useState/useEffect 使えない
export default function Page() {
  return <div>静的なコンテンツ</div>
}

// Client Component
// → ブラウザで実行。useState/useEffect 使える
'use client'
export default function InteractivePage() {
  const [data, setData] = useState(null)
  // ...
}
```

**このプロジェクトでは：** ほぼ全部のページに `'use client'` がついています。
APIを叩いて動的に表示するページばかりなので。

---

## 2. lib/api.ts — APIクライアント

バックエンドへのリクエストは全部ここに集約しています。

```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// 普通のGET/POST
export async function getClients(params?: {...}) {
  const response = await fetch(`${API_URL}/api/clients?...`)
  if (!response.ok) throw new Error('...')
  return response.json()
}

// SSEストリーミング（AIチャット用）
export async function streamAIChat(message: string, sessionId: string) {
  const response = await fetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  })
  return response   // ← bodyをそのまま返す（Readerで読む）
}
```

**新しいAPIを追加するには：**
```typescript
export async function createSomething(data: SomeType) {
  const response = await fetch(`${API_URL}/api/something`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('エラーメッセージ')
  return response.json() as Promise<SomeResponse>
}
```

---

## 3. types/index.ts — 型定義

バックエンドのPydanticスキーマと対応させます。

```typescript
export interface Client {
  id: number
  name: string
  disability_type: string
  status: string
  // ... バックエンドの ClientResponse と合わせる
}
```

**バックエンドにフィールドを追加したら、ここも追加してください。**

---

## 4. hooks/ — カスタムフック

### useAIStream.ts の仕組み

SSEを受信して状態を管理するフックです。

```typescript
export function useAIStream() {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null)

  const sendMessage = async (message: string, sessionId: string) => {
    // 1. ユーザーメッセージを追加
    setMessages(prev => [...prev, { role: 'user', content: message }])

    // 2. 空のアシスタントメッセージを追加（これに追記していく）
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    // 3. SSEを受信してリアルタイムに更新
    const response = await streamAIChat(message, sessionId)
    const reader = response.body.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // SSEの行を解析
      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = JSON.parse(line.slice(6))

        // イベント種別で処理を分岐
        if (data.type === 'text') {
          // アシスタントメッセージに追記
          setMessages(prev => { /* 最後のメッセージに content を追記 */ })
        } else if (data.type === 'tool_call') {
          setCurrentToolCall({ name: data.name, input: data.input })
        } else if (data.type === 'done') {
          setCurrentToolCall(null)
        }
      }
    }
  }

  return { messages, isStreaming, currentToolCall, sendMessage, clearMessages }
}
```

---

## 5. components/ — コンポーネント

### Sidebar.tsx

```tsx
// ナビゲーションリンクの定義
const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/clients', label: '利用者管理', icon: Users },
  // ↑ ここに追加するだけで新しいページへのリンクが増える
]
```

### ChatMessage.tsx

```tsx
// ユーザーとアシスタントで見た目を変える
function ChatMessage({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={isUser ? 'justify-end' : 'justify-start'}>
      <div className={isUser ? 'bg-teal-600 text-white' : 'bg-white border'}>
        {message.content}
      </div>
    </div>
  )
}
```

### ToolCallIndicator.tsx

```tsx
// ツール名を日本語に変換して表示
const TOOL_NAMES: Record<string, string> = {
  'search_clients': '利用者を検索',
  'get_client_detail': '利用者情報を取得',
  // ↑ ツールを追加したらここにも追加
}
```

---

## 6. ページ実装パターン

### データ一覧ページの基本パターン

```tsx
'use client'
export default function SomePage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>読み込み中...</div>

  return (
    <div>
      {items.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  )
}
```

### 動的ルート（/clients/[id]）

```tsx
// app/clients/[id]/page.tsx
export default function ClientDetailPage({
  params
}: {
  params: { id: string }  // URLの [id] 部分が入る
}) {
  const clientId = parseInt(params.id)
  // clientId でAPIを叩く
}
```

---

## 7. shadcn/ui コンポーネントの使い方

```tsx
// インポート
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'

// 使用例
<Button variant="default" size="sm" onClick={handleClick}>
  保存
</Button>

<Badge variant="outline" className="bg-green-100 text-green-800">
  アクティブ
</Badge>

// 新しいコンポーネントを追加するには
// npx shadcn@latest add [コンポーネント名]
// 例: npx shadcn@latest add table
```

---

## 8. Tailwind CSS のカラーパレット

このプロジェクトで使っているカラー：

| 用途 | クラス |
|------|--------|
| プライマリ | `teal-600` (#0d9488) |
| サイドバー背景 | `slate-900` |
| サイドバーテキスト | `slate-400` |
| アクティブメニュー | `teal-600` |
| 背景 | `slate-50` |
| カード | `white` |
| 身体障害バッジ | `blue-100 / blue-800` |
| 精神障害バッジ | `purple-100 / purple-800` |
| 知的障害バッジ | `green-100 / green-800` |

---

## 9. よくある修正パターン

### 新しいページを追加する

```
1. app/新ページ/page.tsx を作成
2. components/layout/Sidebar.tsx の navItems に追加
3. lib/api.ts に必要なAPI関数を追加
4. types/index.ts に型を追加
```

### フォームに項目を追加する

```tsx
// 例：ClientForm.tsx に電話番号フィールドを追加
<div>
  <label>電話番号</label>
  <Input
    value={form.phone}
    onChange={(e) => setForm({ ...form, phone: e.target.value })}
  />
</div>
```

### カードに情報を追加する

```tsx
// ClientCard.tsx
<Card>
  <CardContent>
    <p>{client.name}</p>
    <p>{client.disability_type}</p>
    {/* ↓ 追加したい情報 */}
    <p>{client.phone}</p>
  </CardContent>
</Card>
```
