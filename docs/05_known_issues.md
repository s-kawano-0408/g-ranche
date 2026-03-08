# 既知の課題・修正が必要な箇所

自分で修正していくための作業リストです。

---

## 🔴 高優先度（動作に影響する可能性あり）

### 1. 認証・認可が未実装
- 現状：誰でもAPIにアクセスできる
- 修正案：
  - シンプルな固定パスワード認証（`.env` にパスワードを設定）
  - またはJWT認証（FastAPIUsers ライブラリが便利）
- 影響ファイル：`backend/main.py`, `backend/routers/*.py`

### 2. DBマイグレーションが未対応
- 現状：カラム追加するたびにDBファイルを削除する必要がある
- 修正案：Alembic を導入する
  ```bash
  uv add alembic
  alembic init migrations
  # 以降は alembic revision/upgrade で管理
  ```
- 影響ファイル：`backend/pyproject.toml`, `backend/database.py`

### 3. スタッフ管理ページが未実装
- 現状：`staffs` テーブルはあるがUIがない
- シードデータのスタッフ（id=1, 2）が各所でハードコードされている
- 修正案：`/staff` ページを追加、スタッフ選択UIを各フォームに追加
- 影響ファイル：`frontend/src/components/clients/ClientForm.tsx` など

---

## 🟡 中優先度（UXの改善）

### 4. エラーハンドリングが簡素
- 現状：エラー時に `console.error` またはアラートのみ
- 修正案：shadcn の `toast` コンポーネントでエラー通知を表示
  ```bash
  npx shadcn@latest add toast
  ```
- 影響ファイル：`frontend/src/components/**/*.tsx`

### 5. フォームバリデーションが不十分
- 現状：必須チェックのみ
- 修正案：`react-hook-form` + `zod` の導入
  ```bash
  npm install react-hook-form zod @hookform/resolvers
  ```

### 6. ローディング状態の表示が粗い
- 現状：`読み込み中...` テキストのみ
- 修正案：Skeleton コンポーネントを使う
  ```bash
  npx shadcn@latest add skeleton
  ```

### 7. ページネーションが未実装
- 現状：全件取得（利用者が増えると遅くなる）
- 修正案：APIに `page` / `limit` クエリパラメータを追加
  ```python
  # routers/clients.py
  @router.get("/")
  def list_clients(page: int = 1, limit: int = 20, ...):
      offset = (page - 1) * limit
      stmt = stmt.offset(offset).limit(limit)
  ```

### 8. スケジュールのカレンダーが簡素
- 現状：自前実装の月間カレンダー
- 修正案：`react-big-calendar` や `@fullcalendar/react` に置き換える
  ```bash
  npm install react-big-calendar
  ```

---

## 🟢 低優先度（機能追加・改善）

### 9. PDFエクスポートが未実装
- 修正案：`@react-pdf/renderer` または `jspdf` でPDF出力
- 用途：支援計画書・モニタリング報告書の印刷

### 10. 支援計画書の詳細フォームが未実装
- 現状：AI生成テキストのみ表示
- 修正案：生成したテキストを編集・保存できるフォームを追加

### 11. 通知機能が未実装
- モニタリング期日が近くなったらメール通知
- 修正案：cronジョブ + smtplib（Python標準）

### 12. AIチャットの会話リセットがセッションをまたぐ
- 現状：ページを離れると同じsession_idが使われ続ける（ブラウザリロードで新しいセッションになる）
- 修正案：セッション一覧画面を作り、過去の会話を選択・削除できるようにする

### 13. 支援記録の添付ファイル機能が未実装
- 修正案：`python-multipart` はすでに入っているのでバックエンドは対応可能
  ```python
  from fastapi import File, UploadFile
  @router.post("/upload")
  async def upload_file(file: UploadFile = File(...)):
      # ファイルを保存
  ```

### 14. 統計・レポート機能が簡素
- ダッシュボードの数字だけ
- 修正案：月別グラフなど（`recharts` ライブラリが shadcn に対応）
  ```bash
  npm install recharts
  ```

---

## 📝 コード品質

### 15. TypeScript の型が緩い箇所がある
- `as any` や `unknown` を使っている箇所の型を厳密化

### 16. コンポーネントの分割が不十分な箇所
- `app/clients/[id]/page.tsx` が長い → タブごとにコンポーネント分割

### 17. APIのエラーレスポンスを統一
- 現状：エラーメッセージの形式がバラバラ
- 修正案：`{"detail": "エラーメッセージ"}` に統一（FastAPIのデフォルトに合わせる）

---

## 環境・インフラ

### 18. 本番デプロイの準備が未整備
- CORSを本番ドメインに限定する（現状は全許可）
  ```python
  # main.py
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["https://yourdomain.com"],  # 本番では限定
  )
  ```
- HTTPSの設定（nginx + Let's Encrypt）
- 環境変数の管理（`.env` を本番サーバーに置かない）

### 19. SQLiteからPostgreSQLへの移行
- 複数人で同時アクセスが増えたら移行を検討
- `DATABASE_URL` を変えるだけで移行できる（SQLAlchemyのおかげ）
  ```
  DATABASE_URL=postgresql://user:password@localhost/welfare_db
  ```
