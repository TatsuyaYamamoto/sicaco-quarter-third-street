# AGENTS.md

## ドキュメント

設計などの文書は `docs/` 配下に、[OKF v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/6886cc67650de5600a579ebbd1b164e32f9f356d/okf/SPEC.md) に従って書いている。作業を始めるときは、次を取っ掛かりにして関連するドキュメントを把握する。

- `docs/**/index.md`: 各ディレクトリのドキュメントの一覧。たどると bundle（Markdown ファイルのディレクトリツリー）の全体が分かる
- `docs/**/log.md`: ドキュメントの更新履歴
- `docs/conventions.md`: `docs/` 配下の規約（書き方の形式・凡例など）

## Coding

### TypeScript

- 関数の戻り値の型は、できるだけ明示する。読み手が実装を追わなくても戻り値が分かり、型チェックの負荷も下がるため。推論に任せるしかない場合や、書くとかえって複雑になる場合（例: Hono のルートを返す関数）は書かなくてよい。

### Comments

- ファイル全体の説明は、`@file` を付けた JSDoc で書く。
- 変数・関数・クラス・プロパティなど、宣言の説明は JSDoc で書く。
- 行（複数行を含む）への補足は、`//` のインラインコメントで書く。

## Pull Request

- title
  - [Angular のコミットメッセージのガイドライン](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md) の header の形式（`<type>(<scope>): <summary>`）で、英語で書く。type はガイドラインのもの（build / ci / docs / feat / fix / perf / refactor / test）を使う。
- description
  - [`.github/pull_request_template.md`](.github/pull_request_template.md) の見出し（Background / What / Why / How / Test / Anything else）に沿って、日本語で書く。
  - PR の最終的な状態を説明する。PR を作るまでや、レビューでのやり取りの経緯は書かない。
