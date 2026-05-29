# セキュリティ設計 — 決定事項

## リリース形態
- **クラウド公開**（3人限定：本人・母・弟）
- 他の事業所には非公開
- 3人はそれぞれ別のネットワークにいるためクラウドが必要

## 権限管理
- **管理者（admin）**: 本人のみ。利用者の登録・編集・削除、ユーザー管理が可能
- **スタッフ（staff）**: 母・弟。閲覧・記録作成・スケジュール管理が可能

`users.role` カラムで判定。バックエンド側は `require_admin` 依存性で 403 を返します。
フロント側は `Sidebar.tsx` が `user.role === 'admin'` のときだけ「設定」リンクを表示します。

---

## 認証方式：JWT + HttpOnly Cookie

### 仕組み
1. ログイン時にサーバーが JWT トークンを生成（`sub` はユーザーの email）
2. **HttpOnly Cookie** としてブラウザにセット
3. 以降のリクエストでブラウザが自動的に Cookie を送信
4. サーバー側で Cookie からトークンを取り出して検証し、`users` テーブルから該当ユーザーを引き当てる
5. 残り有効期限が 2 時間以下になっていたら、新しいトークンで Cookie を上書き（スライド延長）

### なぜHttpOnly Cookieか
- JavaScript から `document.cookie` でアクセスできない
- XSS 攻撃でトークンを盗まれるリスクがなくなる
- `localStorage` にトークンを保存するよりも安全

### Cookie設定（`backend/auth.py` / `backend/routers/auth.py`）
```python
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,                                 # JSからアクセス不可
    samesite="lax",                                # CSRF対策
    secure=os.getenv("ENVIRONMENT") == "production",  # 本番のみ HTTPS 必須
    max_age=8 * 3600,                              # 8時間
)
```

### パスワード保護
- `bcrypt` でハッシュ化して `users.password_hash` に保存
- 検証は `bcrypt.checkpw`
- 平文パスワードは DB にも JWT にも入らない

### ログイン API のレートリミット
- `slowapi` で `POST /api/auth/login` に **5回/分・30回/時**（IP 単位）
- 超過時は 429 + 「試行回数が多すぎます」を返す

### 自動ロック
- 30 分間操作がなければ自動ログアウト（`useAutoLock` フック）
- マウス/キーボード/タッチ操作でタイマーリセット

---

## セキュリティヘッダー

### CSP（Content Security Policy）
- `frontend/src/middleware.ts` で全リクエストに付与
- 現状は緩めの固定値（Next.js 本番ビルドのインラインスクリプト/評価との互換性のため）
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
  - `style-src 'self' 'unsafe-inline'`
  - `img-src 'self' data: blob:`
  - `font-src 'self'`
  - `connect-src 'self'`
- Oracle 移行時に nonce ベースへ戻す予定

### その他（`frontend/next.config.ts`）
- **X-Frame-Options**: DENY（クリックジャッキング防止）
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Strict-Transport-Security**: max-age=31536000; includeSubDomains

---

## CORS設定
- `ALLOWED_ORIGINS` 環境変数で制御（デフォルト: `http://localhost:3000`）
- `credentials: include` を使うため、ワイルドカード `*` は使用不可
- 本番ではデプロイ先のドメインのみ許可

---

## 監査ログ
- `backend/main.py` のミドルウェアが `/api/` 配下のすべてのリクエストを記録
- 形式: `METHOD PATH user=<email> ip=<client_ip> status=<code>`
- ユーザー名は Cookie の JWT から抽出（未認証は `anonymous`）
- 不正アクセス・誤操作の追跡用

---

## 個人情報の保護

### DB保存
- 利用者の個人情報（姓名・フリガナ・生年月日・受給者証番号）は**DBに直接保存**（仮名化やフィールドハッシュ化は行わない）
- DB は Supabase PostgreSQL（Tokyo リージョン）で管理
- Supabase のセキュリティ: 接続は暗号化、アクセスは接続文字列で制限

### Excel転記（OCR）
- Claude Vision API を使用
- **Anthropic は「APIデータをモデル訓練に使用しない」と公式に明言**
- 福祉書類の要配慮個人情報を安全に処理できる
- アップロードした画像はバックエンド側でファイル保存しない（メモリ上で処理 → Claude に転送 → 破棄）

### Git管理
- `.env`（APIキー・DB接続文字列・SECRET_KEY）は Git 管理外
- Excel テンプレート（事業所名含む）・書類画像は Git 管理外
- リポジトリは public — コードは公開しても機密情報は含まない

---

## 既知の制約
- 本番デプロイ時は `ENVIRONMENT=production` を設定すること（Cookie の `secure` フラグ用）
- 本番では `SECRET_KEY` 環境変数の設定が必須（未設定なら起動時に `RuntimeError`）
- IP 制限は動的 IP のため不可 → JWT + HTTPS + CORS 制限 + レートリミットで対応
