# sicaco-quarter-third-street

シカコ区3番街の自宅に「住まわせる」AI アシスタント **Fairy** のリポジトリ。

## ドキュメント

設計などの文書は [`docs/`](docs/) 配下で、[Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) に沿って管理している。全体像は [`docs/index.md`](docs/index.md) から読む。

## 開発

```sh
pnpm install
cp .dev.vars.example .dev.vars # secrets を書く
pnpm db:migrate:local
pnpm dev
```

| コマンド | 内容 |
| --- | --- |
| `pnpm test` | テスト（Workers のランタイム上で実行する） |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | 型チェック / lint / format |
| `pnpm db:generate` | `src/db/schema.ts` からマイグレーションの SQL を生成する |
| `pnpm cf-typegen` | `wrangler.jsonc` から `worker-configuration.d.ts` を生成する |

### デプロイの準備

1. `pnpm exec wrangler d1 create fairy` で D1 を作り、`wrangler.jsonc` の `database_id` を置き換える。
2. `pnpm exec wrangler secret put <KEY>` で secrets を登録する（キーは `.dev.vars.example` を参照）。
3. `pnpm db:migrate:remote` でマイグレーションを適用し、`pnpm deploy` する。
