# sicaco-quarter-third-street

シカコ区3番街の自宅に「住まわせる」AI アシスタント **Fairy** のリポジトリ。

## ドキュメント

設計などの文書は [`docs/`](docs/) 配下で、[Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) に沿って管理している。全体像は [`docs/index.md`](docs/index.md) から読む。

## 構成

pnpm workspace の monorepo。

| パス | 内容 |
| --- | --- |
| [`packages/fairy`](packages/fairy/) | Fairy の Worker（Cloudflare Workers） |
| [`docs`](docs/) | 設計などの文書 |
| [`FAIRY.md`](FAIRY.md) | Fairy のキャラクター設定 |

## 開発

```sh
pnpm install
```

| コマンド | 内容 |
| --- | --- |
| `pnpm lint` / `pnpm format` | リポジトリ全体の lint / format |
| `pnpm typecheck` | ルートと全パッケージの型チェック |
| `pnpm test` | 全パッケージのテスト |

パッケージごとの手順は、各パッケージの README を参照。
