# Git 管理ガイド

## 現在の状態

- GitHub リポジトリ: public（`g-ranche`）
- ブランチ: `main`（本番）、`develop`（開発）
- 開発フロー: `develop` で作業 → `main` にマージ → デプロイ

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
git add .        # 全ファイルまとめて追加

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

```
backend/.venv/                → Pythonの仮想環境（uv が管理する）
*.db                          → データベースファイル
.env                          → APIキー・パスワード（絶対にGitHubに上げない）
node_modules/                 → フロントエンドの依存パッケージ
frontend/.next/               → Next.js のビルド結果
.DS_Store                     → macOSが作るゴミファイル
backend/templates/*.xlsx      → Excelテンプレート（事業所名が含まれるため）
backend/templates/*.jpg,*.png → テスト用画像ファイル
```

**なぜ .env を除外するのか：**
`.env` にはAnthropicのAPIキーやDB接続文字列が書かれています。
GitHubに上げると世界中から見えてしまい、不正利用される危険があります。

**なぜテンプレートを除外するのか：**
Excelテンプレートには事業所名など固有情報が含まれており、リポジトリがpublicのため。
デプロイ先（Fly.io）にはVolumeに手動で配置します。
