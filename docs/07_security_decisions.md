# セキュリティ設計 — 決定事項

## リリース形態
- **クラウド公開**（3人限定：本人・母・弟）
- 他の事業所には非公開
- 3人はそれぞれ別のネットワークにいるためクラウドが必要

## 権限管理
- **管理者（admin）**: 本人のみ。利用者の登録・編集・削除が可能
- **スタッフ（staff）**: 母・弟。閲覧・記録作成・スケジュール管理が可能

---

## 認証方式：JWT + HttpOnly Cookie

### 仕組み
1. ログイン時にサーバーがJWTトークンを生成
2. **HttpOnly Cookie** としてブラウザにセット
3. 以降のリクエストでブラウザが自動的にCookieを送信
4. サーバー側でCookieからトークンを取り出して検証

### なぜHttpOnly Cookieか
- JavaScriptから`document.cookie`でアクセスできない
- XSS攻撃でトークンを盗まれるリスクがなくなる
- `localStorage` にトークンを保存するよりも安全

### Cookie設定
```python
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,        # JSからアクセス不可
    samesite="lax",       # CSRF対策
    secure=True,          # 本番ではHTTPSのみ（ローカルはFalse）
    max_age=28800,        # 8時間
)
```

### 自動ロック
- 30分間操作がなければ自動ログアウト（`useAutoLock` フック）
- マウス/キーボード/タッチ操作でタイマーリセット

---

## セキュリティヘッダー

### CSP（Content Security Policy）
- `middleware.ts` でリクエストごとにCSPヘッダーを設定
- `default-src 'self'`, `connect-src 'self'`, `img-src 'self' data: blob:`

### その他
- **X-Frame-Options**: DENY（クリックジャッキング防止）
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin

---

## CORS設定
- `ALLOWED_ORIGINS` 環境変数で制御（デフォルト: `http://localhost:3000`）
- `credentials: include` を使うため、ワイルドカード `*` は使用不可
- 本番ではデプロイ先のドメインのみ許可

---

## 個人情報の保護

### DB保存
- 利用者の個人情報（姓名・フリガナ・生年月日・受給者証番号）は**DBに直接保存**
- DBはSupabase PostgreSQL（Tokyoリージョン）で管理
- Supabaseのセキュリティ: 接続は暗号化、アクセスは接続文字列で制限

### Excel転記（OCR）
- Claude Vision APIを使用
- **Anthropicは「APIデータをモデル訓練に使用しない」と公式に明言**
- 福祉書類の要配慮個人情報を安全に処理できる

### Git管理
- `.env`（APIキー・DB接続文字列）はGit管理外
- Excelテンプレート（事業所名含む）はGit管理外
- リポジトリはpublic — コードは公開しても機密情報は含まない

---

## 既知の制約
- 本番デプロイ時は `ENVIRONMENT=production` を設定すること（Cookieの`secure`フラグ用）
- IP制限は動的IPのため不可 → JWT + HTTPS + CORS制限で対応
