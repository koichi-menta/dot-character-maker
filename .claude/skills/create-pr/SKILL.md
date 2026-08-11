---
name: create-pr
description: このリポジトリ(litom/egp)でPull Requestを作成する際に使用する。「PR作って」「PRを出して」「pull requestを作成して」「この変更をPRにして」「commit-push-prして」のようなリクエストがあった場合は必ずこのskillに従うこと。ブランチ作成・コミット・push・`gh pr create`までを、このリポジトリ固有の日本語コミット規約とPRフォーマットに沿って一貫して実行する。
---

# PR作成 (litom/egp)

このリポジトリでPull Requestを作る一連の作業（ブランチ作成 → コミット → push → PR作成）を、リポジトリの慣習に沿って行う。ユーザーがこのskillをトリガーする発話（「PR作って」など）をした時点で、push・PR作成まで一気に進めてよいという同意とみなし、各ステップごとに逐一確認を挟まない。ただし機密情報を含むファイルのステージや、破壊的なgit操作については通常通り慎重に扱う。

## 手順

### 1. 現状把握

並行して実行する:
- `git status` — 未追跡ファイルを確認（`-uall`は使わない）
- `git diff HEAD` — ステージ済み・未ステージの変更を確認
- `git branch --show-current` — 現在のブランチ
- `git log --oneline -15` — 直近のコミットメッセージのスタイルを再確認

### 2. ブランチ作成（mainブランチ上にいる場合のみ）

`main`ブランチ上で作業している場合は、新しいブランチを切ってから進める。ブランチ名は `<type>/<変更内容を表す短い英語のkebab-case>` 形式にする（例: `feat/turn-instruction-landmark`, `fix/intersection-skip-bug`）。すでにフィーチャーブランチ上にいる場合はそのまま使う。

### 3. リポジトリ規約のチェック

`.github/copilot-instructions.md` により、コード変更後は以下を実行することになっている。該当する変更が含まれる場合は、コミット前に実行してエラーがないことを確認する:
- フロントエンド（`src/`配下など）に変更がある場合: `pnpm lint:fe`
- Rust（`src-tauri/`配下）に変更がある場合: `cd src-tauri && cargo fmt`

### 4. コミット

このリポジトリのコミットメッセージは `type: 日本語の説明` 形式（Conventional Commits風のtype + 日本語の説明文、英語の説明文は使わない）。`git log`の実例:

```
feat: 「ランドマークの手前/奥で曲がる」指示を認識できるように対応
fix: 曲がる指示で交差点を通過後、中間点をスキップして次の交差点まで進むよう修正
refactor: マップのデータを別ファイルとして管理する
chore: readme更新
```

typeは変更内容に応じて `feat` / `fix` / `refactor` / `chore` などから選ぶ。関連ファイルのみを `git add` し（`git add -A` や `.` は避ける）、上記スタイルに合わせた1コミットを作成する。複数の独立した変更が混ざっている場合はユーザーに分割すべきか確認する。

### 5. Push

`git push -u origin <branch-name>` でリモートにpushする。

### 6. PR作成

`gh pr create` を使い、タイトル・本文とも日本語で作成する。タイトルはコミットメッセージと同じ `type: 日本語の説明` 形式にする（複数コミットがある場合は変更全体を要約したタイトルにする）。本文はHEREDOCで渡し、次のテンプレートに従う:

```bash
gh pr create --title "feat: ◯◯できるように対応" --body "$(cat <<'EOF'
## 概要
- 変更点を1〜3個の箇条書きで

## テスト計画
- [ ] 動作確認した内容をチェックリストで

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- ベースブランチは常に `main`（`gh pr create`のデフォルトのターゲットで問題ない）。
- ブランチにあるコミットは1つとは限らないので、`git log main..HEAD` などで**このブランチの全コミット**を確認してからPR本文の概要を書く（直近のコミットだけを見ない）。
- そのブランチに対応するPRがすでに存在する場合（`gh pr view`で確認できる）は、新規作成せずpushのみで済ませる。

### 7. 結果報告

作成されたPRのURLをユーザーに伝えて完了とする。
