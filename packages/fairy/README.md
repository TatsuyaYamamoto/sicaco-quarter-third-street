# fairy

Fairy の Worker。設計は [`docs/`](../../docs/index.md) を参照。

## 開発

このディレクトリで実行する。

```sh
cp .dev.vars.example .dev.vars # secrets を書く
pnpm db:migrate:local
pnpm dev
```

| コマンド | 内容 |
| --- | --- |
| `pnpm test` | テスト（Workers のランタイム上で実行する） |
| `pnpm typecheck` | 型チェック |
| `pnpm db:generate` | `src/db/schema.ts` からマイグレーションの SQL を生成する |
| `pnpm cf-typegen` | `wrangler.jsonc` から `worker-configuration.d.ts` を生成する |

## デプロイの準備

1. `pnpm exec wrangler d1 create fairy` で D1 を作り、`wrangler.jsonc` の `database_id` を置き換える。
2. `pnpm exec wrangler secret put <KEY>` で secrets を登録する（キーは `.dev.vars.example` を参照）。
3. `pnpm db:migrate:remote` でマイグレーションを適用し、`pnpm deploy` する。
