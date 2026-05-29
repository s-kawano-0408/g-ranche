# Git 管理ガイド

## 現在の状態

- GitHub リポジトリ: public（`g-ranche`）
- ブランチ: `main`（本番）、`develop`（開発）
- 開発フロー: `develop` で作業 → `main` にマージ → `fly deploy`

---

## Git の基本概念

コードの「セーブデータ」を管理するツール。

```
普通のセーブ → 上書きすると前のデータが消える
Git のセーブ → 全ての変更履歴が残る
              → 「3日前の状態に戻したい」が簡単にできる
              → 「この機能を追加したとき何を変えたか」が分かる
```

### 基本の3ステップ（毎回この繰り返し）

```bash
# 1. 今の状態を確認
git status

# 2. セーブ対象に追加（ステージング）
git add ファイル名
git add .        # 全ファイルまとめて追加（注意: .env など機密が混ざらないか確認）

# 3. セーブする（コミット）
git commit -m "何をしたか分かるメッセージ"
```

---

## よく使うコマンド

```bash
# 履歴を確認する
git log --oneline

# 何が変わったか確認する（ステージング前）
git diff

# 何が変わったか確認する（ステージング後）
git diff --staged

# 特定のコミットの中身を確認する
git show コミットID

# ステージングを取り消す
git restore --staged ファイル名

# ファイルの変更を取り消す（注意：元に戻せない）
git restore ファイル名
```

---

## ブランチ戦略

```
main     ← 本番（デプロイ対象）
  └── develop  ← 開発（ローカルで作業するブランチ）
```

```bash
# developブランチで作業
git checkout develop

# 開発完了 → mainにマージ
git checkout main
git merge develop

# デプロイ
fly deploy

# developに戻る
git checkout develop
```

---

## コミットメッセージの書き方

```
種別: 何をしたか

種別の例：
  feat:     新機能を追加
  fix:      バグを修正
  docs:     ドキュメントを更新
  style:    見た目の変更（機能は変わらない）
  refactor: コードの整理（機能は変わらない）
  chore:    ツール・設定の変更
```

例：
```
feat: 利用者の検索機能を追加
fix: ダッシュボードの利用者数を利用中のみに変更
docs: ドキュメントを最新の状態に更新
```

---

## .gitignore で管理対象外にしているもの

`/.gitignore` から抜粋:

```
backend/.venv/                → Pythonの仮想環境（uv が管理する）
__pycache__/                  → Pythonのキャッシュ
*.db, *.sqlite, *.sqlite3     → ローカルDBファイル
.env, .env.local, .env.*.local → 機密情報（APIキー、DB接続文字列）
.env.production               → 本番環境変数（Oracle向けに使用）
node_modules/                 → フロントエンドの依存パッケージ
frontend/.next/, frontend/out/ → Next.js のビルド成果物
.DS_Store, Thumbs.db          → OSが作るゴミファイル
.vscode/                      → エディタの個人設定
pgdata/                       → ローカル Postgres のデータ
.claude/mcp.json              → Claude Code のMCP設定（パスワードを含む）
backend/templates/*.xlsx      → Excelテンプレート（事業所名を含む）
backend/templates/*.jpg/png   → 書類画像（個人情報を含む）
interview-notes/              → 個人メモ
```

**なぜ .env を除外するのか：**
`.env` には Anthropic の API キーや DB 接続文字列、`SECRET_KEY` が書かれています。
GitHub に上げると世界中から見えてしまい、不正利用される危険があります。

**なぜテンプレート・画像を除外するのか：**
Excel テンプレートには事業所名など固有情報、書類画像には要配慮個人情報が含まれており、
リポジトリが public のため絶対にコミットしてはいけません。
デプロイ先（Fly.io）には Volume に手動で配置します。
