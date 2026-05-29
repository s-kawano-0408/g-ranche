# フロントエンド実装ガイド

## 1. Next.js App Router の基本

`app/` ディレクトリ以下のフォルダ構造がそのままURLになります。

```
app/
├── layout.tsx          → 共通レイアウト（AuthProvider・ToastProvider・サイドバー）
├── page.tsx            → http://localhost:3000/
├── dashboard/          → ダッシュボード
├── clients/
│   ├── page.tsx        → 利用者一覧
│   └── [id]/page.tsx   → 利用者詳細（動的ルート）
├── records/            → 支援記録
├── schedules/          → スケジュール（カレンダー）
├── monthly-tasks/      → 月間業務管理
├── ai/                 → AIアシスタント
├── transcription/      → Excel転記
├── login/              → ログイン画面
├── settings/           → 設定（ユーザー管理、管理者のみ）
└── api/transcription/  → OCR/Excel生成用 Route Handler（90秒タイムアウト）
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

### Excel転記だけ Route Handler を経由する

OCR と Excel 生成は処理が長いため、`frontend/src/app/api/transcription/{ocr,generate}/route.ts`
で 90 秒タイムアウトの Route Handler を挟んでバックエンドに転送しています。
それ以外の API は Next.js の `rewrites` または Caddy が直接バックエンドに流します。

---

## 3. types/index.ts — 型定義

バックエンドのPydanticスキーマと対応させます（日付はISO文字列で受け渡し）。

```typescript
export interface Client {
  id: number
  family_name: string
  given_name: string
  family_name_kana: string
  given_name_kana: string
  birth_date: string        // ISO 日付文字列
  certificate_number: string
  gender: string
  client_type: string       // "児"/"者"
  staff_id: number
  status: string            // "active"/"inactive"
  end_date: string
  notes: string
}
```

**バックエンドにフィールドを追加したら、ここも追加してください。**

---

## 4. hooks/ — カスタムフック

### SWR データ取得フック

全ページのデータ取得は SWR ベースのフックに統一しています。
2 回目以降のページ遷移はキャッシュから即表示されます。

```typescript
// hooks/useClients.ts
export function useClients() {
  const { data: clients = [], error, isLoading: loading, mutate } = useSWR<Client[]>(
    '/api/clients',
    fetcher,
  )

  const addClient = useCallback(async (data) => {
    const newClient = await createClient(data)
    await mutate([...clients, newClient], false)  // 楽観更新
    return newClient
  }, [clients, mutate])

  return { clients, loading, error, refetch: mutate, addClient, /* editClient, removeClient */ }
}
```

`useRecords` / `useSchedules` も同じパターン。`useSchedules` は表示月 ±1 ヶ月だけ取りに行くため、日付レンジを引数で渡します。

### useAIStream.ts
SSE を受信して状態を管理するフック。AI チャットのリアルタイム表示に使います。
`text` / `tool_call_start` / `tool_call` / `tool_result` / `done` / `error` の各イベント型を処理します。

### useAutoLock.ts
30 分間操作がなければ自動でログアウトするフック。マウス・キーボード・タッチイベントでタイマーリセット。

---

## 5. contexts/ — Reactコンテキスト

### AuthContext.tsx — 認証状態管理
- `/api/auth/me` を呼んでログイン状態を確認
- ログイン直後に呼ぶ `refreshUser` を公開
- `useAutoLock` を内部で使い、30 分無操作で自動ログアウト

```typescript
const { user, loading, logout, refreshUser } = useAuth()
```

### ToastContext.tsx — トースト通知
- `showToast(message, type)` で成功/エラーを画面右下に通知
- 3 秒で自動消去、×ボタンで即閉じ

```typescript
const { showToast } = useToast()
showToast('保存しました')              // 成功（緑）
showToast('保存に失敗しました', 'error')  // エラー（赤）
```

---

## 6. components/ — コンポーネント

```
components/
├── ai/             ChatMessage / ToolCallIndicator / DocumentPanel
├── clients/        ClientCard / ClientCombobox / ClientForm / ClientSearch
├── dashboard/      MonitoringAlert / StatsCard / TodaySchedule
├── layout/         Sidebar / Header / LayoutWrapper
├── records/        RecordForm / RecordTimeline
├── schedules/      CalendarView / ScheduleForm
├── transcription/  ImageUploader / SheetSelector / FieldPreview
└── ui/             shadcn/ui コンポーネント群
```

### Sidebar.tsx

```tsx
const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/clients', label: '利用者管理', icon: Users },
  { href: '/monthly-tasks', label: '月間業務管理', icon: ClipboardList },
  { href: '/schedules', label: 'スケジュール', icon: Calendar },
  { href: '/records', label: '支援記録', icon: FileText },
  { href: '/ai', label: 'AIアシスタント', icon: Bot },
  { href: '/transcription', label: 'Excel転記', icon: FileSpreadsheet },
]
// ↑ navItems に追加するだけで新しいページへのリンクが増える
// 「設定」リンクは user.role === 'admin' のときだけ表示
```

レイアウトはデスクトップで固定サイドバー、モバイルでハンバーガー＋ドロワー（`lg:` で切替）。

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
  const { clients, loading } = useClients()  // SWR フック

  if (loading) return <div>読み込み中...</div>

  return (
    <div>
      {clients.map(c => <ClientCard key={c.id} client={c} />)}
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

月間業務管理のタスク種別ごとの色は `app/monthly-tasks/page.tsx` の `TASK_COLORS` に集約。

---

## 10. middleware.ts と next.config.ts

- **middleware.ts** … 全リクエストに CSP ヘッダーを付与（`unsafe-inline`/`unsafe-eval` を含む緩めの設定。Oracle 移行時に nonce 化予定）
- **next.config.ts**
  - `skipTrailingSlashRedirect: true` で 308 リダイレクトを抑止
  - ローカル開発時のみ `/api/*` を `BACKEND_URL`（既定 `http://localhost:8000`）に rewrite
  - `X-Frame-Options: DENY` / `X-Content-Type-Options: nosniff` / `Referrer-Policy: strict-origin-when-cross-origin` / `Strict-Transport-Security` をヘッダーで配布

---

## 11. よくある修正パターン

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
