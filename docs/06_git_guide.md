# Git 管理ガイド

## 現在の状態（2026-03-08 時点）

- `git init` 済み
- 初回コミット済み（コミットID: ab826cc）
- GitHub への push はまだ

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

# 特定のコミットに戻す（ファイルの中身を確認するだけ）
git show コミットID

# ステージングを取り消す
git restore --staged ファイル名

# ファイルの変更を取り消す（注意：元に戻せない）
git restore ファイル名
```

---

## コミットメッセージの書き方

```
種別: 何をしたか

種別の例：
  feat:  新機能を追加
  fix:   バグを修正
  docs:  ドキュメントを更新
  style: 見た目の変更（機能は変わらない）
  refactor: コードの整理（機能は変わらない）
```

例：
```
feat: 利用者の検索機能を追加
fix: スケジュール画面が表示されないバグを修正
docs: Git管理ガイドを追加
```

---

## .gitignore で管理対象外にしているもの

```
backend/.venv/    → Pythonの仮想環境（uv が管理する）
*.db              → データベースファイル（個人データが入る）
.env              → APIキー・パスワード（絶対にGitHubに上げない）
node_modules/     → フロントエンドの依存パッケージ
frontend/.next/   → Next.js のビルド結果
.DS_Store         → macOSが作るゴミファイル
```

**なぜ .env を除外するのか：**
`.env` にはAnthropicのAPIキーが書かれています。
GitHubに上げると世界中から見えてしまい、不正利用される危険があります。

---

## GitHub に上げる手順（未実施）

1. GitHubでリポジトリを新規作成
2. ローカルとGitHubを紐づける
   ```bash
   git remote add origin https://github.com/ユーザー名/リポジトリ名.git
   ```
3. push する
   ```bash
   git push -u origin main
   ```

→ GitHubのアカウントを作ったら実施する
