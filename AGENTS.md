# AGENTS.md

## ドキュメント

設計などの文書は `docs/` 配下に、[OKF v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/6886cc67650de5600a579ebbd1b164e32f9f356d/okf/SPEC.md) に従って書いている。作業を始めるときは、次を取っ掛かりにして関連するドキュメントを把握する。

- `docs/**/index.md`: 各ディレクトリのドキュメントの一覧。たどると bundle（Markdown ファイルのディレクトリツリー）の全体が分かる
- `docs/**/log.md`: ドキュメントの更新履歴
- `docs/conventions.md`: `docs/` 配下の規約（書き方の形式・凡例など）

## Pull Request

- タイトルは [Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/) の形式で、英語で書く。フェーズの作業ならスコープにフェーズを入れる（例: `feat(phase-1): add LINE webhook handler`）。
- description は [`.github/pull_request_template.md`](.github/pull_request_template.md) の見出し（Background / What / Why / How / Test / Anything else）に沿って、日本語で書く。
