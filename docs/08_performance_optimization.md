# パフォーマンス最適化ドキュメント

## 概要

本アプリでは、ユーザー体感の「もっさり感」を解消するために、3つのレイヤーでパフォーマンス最適化を行った。

1. **データ取得の最適化**（取りすぎを減らす）
2. **ネットワークの無駄を排除**（呼びすぎを減らす）
3. **レンダリングの最適化**（描きすぎを減らす）

---

## 1. データ取得の最適化

### 課題
- ページ遷移のたびに全データを `fetch()` で再取得していた
- スケジュールは全期間分を一括取得していた（過去・未来含む）

### 対策

#### SWRキャッシュ統一
- 全ページのデータ取得を [SWR](https://swr.vercel.app/) フックに統一
- SWRは一度取得したデータをメモリにキャッシュするので、2回目以降のページ遷移ではキャッシュから即表示される
- 例: 利用者一覧 → 詳細 → 一覧に戻る際、一覧データは再取得不要

**Before（月間業務管理）:**
```typescript
// 毎回fetchし直す → ページ遷移のたびに待ち時間が発生
const loadData = async () => {
  const [clientsData, tasksData] = await Promise.all([
    getClients(),          // 200人分を毎回取得
    getMonthlyTasks(year), // 全タスクを毎回取得
  ]);
};
useEffect(() => { loadData(); }, []);
```

**After:**
```typescript
// SWRがキャッシュを管理 → 2回目以降は即表示
const { clients } = useClients();  // SWRフック
const { data: tasks } = useSWR(`/api/monthly-tasks?year=${year}`, fetcher);
```

#### スケジュール取得の日付制限

**Before:**
```typescript
const { schedules } = useSchedules();  // 全期間分を取得
```

**After:**
```typescript
// 表示月 ±1ヶ月だけ取得
const dateRange = useMemo(() => {
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m + 2, 0);
  return { start_date: fmt(start), end_date: fmt(end) };
}, [currentDate]);
const { schedules } = useSchedules(dateRange);
```

### 効果
- ページ遷移時のデータ取得が **毎回fetch → キャッシュ即表示** に改善
- スケジュールのデータ転送量が大幅削減

---

## 2. ネットワークの無駄を排除

### 課題
HARファイル（ブラウザのネットワークログ）を分析したところ、**全APIリクエストが2回飛んでいた**。

```
GET 308  51ms  /api/clients/    ← 末尾スラッシュ付き → リダイレクト
GET 200  19ms  /api/clients     ← リダイレクト後の本来のリクエスト
```

原因: Next.js が `trailingSlash: false`（デフォルト）の設定で、末尾スラッシュ付きURLに対して **308リダイレクト** を返していた。

### 対策

#### Next.js 側
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,  // 308リダイレクトを無効化
};
```

#### FastAPI 側
```python
# main.py - 末尾スラッシュを自動除去するミドルウェア
@app.middleware("http")
async def strip_trailing_slash(request: Request, call_next):
    if request.url.path != "/" and request.url.path.endswith("/"):
        request.scope["path"] = request.url.path.rstrip("/")
    return await call_next(request)
```

### 効果
- **308リダイレクト: 大量 → 0件** に完全解消
- リクエスト数が実質半減

### 調査方法
1. ブラウザの開発者ツール → Network タブ → 「Save all as HAR」でログをエクスポート
2. Pythonスクリプトで HARファイルを解析し、308の件数・レスポンス時間を集計
3. 修正後に再度HARを取得し、改善を確認

---

## 3. レンダリングの最適化

### 課題
月間業務管理ページは **200人 × 12ヶ月 = 2,400個の `<select>` 要素** をレンダリングしている。
フィルターの変更や1つのセルの更新で、2,400セル全部が再描画されていた。

### 対策

#### React.memo でコンポーネントをメモ化
Reactは通常、親コンポーネントが再描画されると子も全部再描画する。
`React.memo` を使うと、propsが変わっていないコンポーネントの再描画をスキップできる。

```typescript
// セル単位でメモ化 — taskTypeが変わらない限り再描画しない
const TaskCell = memo(function TaskCell({ clientId, month, taskType, onTaskChange }) {
  // ...
});

// 行単位でメモ化 — その行のタスクが変わらない限り再描画しない
const ClientRow = memo(function ClientRow({ client, idx, months, taskMap, onTaskChange }) {
  // ...
});
```

#### useMemo でフィルタ結果をメモ化
```typescript
// フィルター条件が変わらない限り、再計算しない
const filteredClients = useMemo(() =>
  clients.filter(/* ... */).sort(/* ... */),
  [clients, statusFilter, clientTypeFilter, search, kanaFilter],
);
```

#### O(1) ルックアップに改善
```typescript
// Before: O(n) — 2,400回 × 配列全走査
const getTask = (clientId, month) =>
  tasks.find(t => t.client_id === clientId && t.month === month);

// After: O(1) — Mapで即座にアクセス
const taskMap = useMemo(() => {
  const map = new Map();
  for (const t of tasks) map.set(`${t.client_id}-${t.month}`, t.task_type);
  return map;
}, [tasks, year]);
```

#### useCallback でハンドラをメモ化
```typescript
// ハンドラの参照が毎回変わると、React.memoが無効化される
// useCallbackで参照を固定する
const handleTaskChange = useCallback(async (clientId, month, value) => {
  // ...
}, [tasks, year, mutateTasks]);
```

### 効果
- セル更新時: 2,400セル全部再描画 → **変更があった1セルだけ再描画**
- フィルター変更時: 200人分のフィルタ+ソートを毎レンダー実行 → **条件が変わった時だけ再計算**

---

## まとめ

| レイヤー | 課題 | 対策 | 効果 |
|----------|------|------|------|
| データ取得 | 毎回全データをfetch | SWRキャッシュ + 日付制限 | 2回目以降は即表示 |
| ネットワーク | 308リダイレクトで全リクエスト2重 | ミドルウェア + Next.js設定 | リクエスト半減 |
| レンダリング | 2,400セル全部再描画 | React.memo + useMemo + Map | 変更箇所だけ再描画 |

一言でまとめると: **「取りすぎ・呼びすぎ・描きすぎ」を減らした。**
