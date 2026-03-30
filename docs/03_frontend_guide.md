# フロントエンド実装ガイド

## 1. Next.js App Router の基本

`app/` ディレクトリ以下のフォルダ構造がそのままURLになります。

```
app/
├── layout.tsx          → 共通レイアウト（サイドバー・認証チェック）
├── page.tsx            → http://localhost:3000/
├── dashboard/
│   └── page.tsx        → http://localhost:3000/dashboard
├── clients/
│   ├── page.tsx        → http://localhost:3000/clients
│   └── [id]/
│       └── page.tsx    → http://localhost:3000/clients/1  （動的ルート）
├── records/            → 支援記録
├── schedules/          → スケジュール（カレンダー）
├── monthly-tasks/      → 月間業務管理
├── ai/                 → AIアシスタント
├── transcription/      → Excel転記
├── login/              → ログイン画面
└── settings/           → 設定（ユーザー管理）
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
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',  // Cookie自動送信（認証用）
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (res.status === 401) {
    window.location.href = '/login'  // セッション切れ → ログインへ
    throw new Error('セッションが切れました')
  }

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

**新しいAPIを追加するには：**
```typescript
export async function createSomething(data: SomeType): Promise<SomeResponse> {
  return fetchAPI<SomeResponse>('/api/something', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
```

---

## 3. types/index.ts — 型定義

バックエンドのPydanticスキーマと対応させます。

```typescript
export interface Client {
  id: number
  family_name: string
  given_name: string
  family_name_kana: string
  given_name_kana: string
  birth_date: string
  certificate_number: string
  gender: string
  client_type: string       // "児"/"者"
  status: string            // "active"/"inactive"
  end_date?: string
  notes?: string
}
```

**バックエンドにフィールドを追加したら、ここも追加してください。**

---

## 4. hooks/ — カスタムフック

### SWRデータ取得フック

全ページのデータ取得はSWRフックに統一しています。SWRはキャッシュを管理するので、2回目以降のページ遷移では即表示されます。

```typescript
// hooks/useClients.ts
export function useClients() {
  const { data, error, isLoading, mutate } = useSWR<Client[]>('/api/clients', fetcher)

  const addClient = async (data: Record<string, unknown>) => {
    const newClient = await createClient(data)
    await mutate()  // キャッシュを再検証
  }

  return { clients: data ?? [], loading: isLoading, error, addClient }
}
```

### useAIStream.ts

SSEを受信して状態を管理するフックです。AIチャットのリアルタイム表示に使います。

---

## 5. contexts/ — Reactコンテキスト

### AuthContext.tsx — 認証状態管理
- Cookie + `/api/auth/me` でログイン状態を確認
- 30分無操作で自動ログアウト（`useAutoLock` フック）

### ToastContext.tsx — トースト通知
- `showToast(message, type)` で成功/エラーを画面右下に通知
- 3秒で自動消去、×ボタンで即閉じ

```typescript
// 使い方
const { showToast } = useToast()
showToast('保存しました')              // 成功（緑）
showToast('保存に失敗しました', 'error')  // エラー（赤）
```

---

## 6. components/ — コンポーネント

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

---

## 7. ページ実装パターン

### データ一覧ページの基本パターン（SWR使用）

```tsx
'use client'
export default function SomePage() {
  const { items, loading } = useItems()  // SWRフック

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
export default function ClientDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const { data: client } = useSWR<Client>(`/api/clients/${id}`, fetcher)
  // ...
}
```

---

## 8. shadcn/ui コンポーネントの使い方

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'

// 使用例
<Button variant="default" size="sm" onClick={handleClick}>
  保存
</Button>

// 新しいコンポーネントを追加するには
// npx shadcn@latest add [コンポーネント名]
```

---

## 9. Tailwind CSS のカラーパレット

| 用途 | クラス |
|------|--------|
| プライマリ | `teal-600` |
| サイドバー背景 | `slate-900` |
| 背景 | `slate-50` / `gray-50` |
| カード | `white` |
| 児バッジ | `pink-100 / pink-700` |
| 者バッジ | `sky-100 / sky-700` |

---

## 10. よくある修正パターン

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
    <p>{client.family_name} {client.given_name}</p>
    <p>{client.client_type}</p>
  </CardContent>
</Card>
```
