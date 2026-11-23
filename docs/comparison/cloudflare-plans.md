---
type: Comparison
title: Cloudflare Workers のプランの比較
description: Workers Free と Workers Paid の違い（技術的な制約・利用量の上限）と、この設計への影響
status: draft
sources:
  - id: cf-workers-limits
    resource: https://developers.cloudflare.com/workers/platform/limits/
    title: "Workers: Limits"
  - id: cf-workers-pricing
    resource: https://developers.cloudflare.com/workers/platform/pricing/
    title: "Workers: Pricing"
  - id: cf-do-pricing
    resource: https://developers.cloudflare.com/durable-objects/platform/pricing/
    title: "Durable Objects: Pricing"
  - id: cf-do-limits
    resource: https://developers.cloudflare.com/durable-objects/platform/limits/
    title: "Durable Objects: Limits"
  - id: cf-d1-limits
    resource: https://developers.cloudflare.com/d1/platform/limits/
    title: "D1: Limits"
  - id: cf-d1-pricing
    resource: https://developers.cloudflare.com/d1/platform/pricing/
    title: "D1: Pricing"
  - id: cf-workers-logs
    resource: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
    title: "Workers Logs"
---

# Cloudflare Workers のプランの比較

Workers Free（無料）と Workers Paid（月 $5）の違いのうち、[全体設計](../design.md) に関係するものをまとめる（2026-11-22 時点の公式ドキュメントで確認[^cf-workers-limits][^cf-workers-pricing][^cf-do-pricing][^cf-do-limits][^cf-d1-limits][^cf-d1-pricing][^cf-workers-logs]）。

## 技術的な制約

| 項目 | Free | Paid | この設計への影響 |
| --- | --- | --- | --- |
| CPU 時間（1 回の呼び出しあたり） | 10 ms | 既定 30 秒（最大 5 分） | Free で最も効く制約。`fetch` の待ち時間（OpenAI・LINE・D1 の応答待ち）は含まれないが、プロンプトの組み立て、JSON の処理、SDK 内部の処理は含まれる。Durable Object にも Workers と同じ上限がかかると書かれているが、Free で 10 ms になると明記した記載はない |
| サブリクエスト（1 回の呼び出しあたり） | 50 | 10,000 | OpenAI・LINE の API と D1 へのクエリが数えられる。1 イベントあたり、OpenAI（再生成を含めて最大 11 回）、プロフィール API、Reply API、D1 への数回のクエリ。D1 は `batch()` で 1 回にまとめられる |
| D1 へのクエリ（1 回の呼び出しあたり） | 50 | 1,000 | 上と同じく、1 イベントあたりのクエリ数に効く |
| D1 の DB あたりのサイズ | 500 MB | 10 GB | 会話ログは無期限で保存するので、長期的には Free で上限に届きうる。テキスト中心なら当面は届かない見込み |
| D1 の Time Travel（ポイントインタイムリカバリ）の保持期間 | 7 日 | 30 日 | 誤ってデータを壊したときに戻せる期間 |
| Workers Logs の保存期間 | 3 日 | 7 日 | 不具合を調べられる期間。Limits ページには区分なしで 7 日とあり、料金ページと食い違う |
| Cron Triggers（アカウント全体） | 5 | 1,000 | Phase 4 の定期実行には Durable Object の Alarms を使う想定なので、影響は小さい |
| 環境変数・Secrets（Worker あたり） | 64 | 128 | 設定値は 10 個なので影響しない |
| 有料プランだけの機能 | — | Workers Logpush、Vectorize、Containers など | Vectorize は将来の長期記憶（ベクトル検索）の候補になりうる |

次の項目はプランによる差がない: Worker のサイズ（非圧縮 64 MiB）、メモリ（128 MB）、`waitUntil` の時間（レスポンスを返してから最大 30 秒）、同時接続（6）。Alarms・WebSocket Hibernation を Free で使えないという記載はない。

## 利用量の上限と超過時の挙動

| 項目 | Free（日次。UTC 0:00 にリセット） | Paid（月間の含まれる量） |
| --- | --- | --- |
| Workers のリクエスト | 10 万 | 1,000 万 |
| Durable Objects のリクエスト | 10 万 | 100 万 |
| Durable Objects の duration | 13,000 GB-s | 40 万 GB-s |
| SQLite（Durable Objects）・D1 の行の読み取り | 500 万 | 250 億 |
| SQLite（Durable Objects）・D1 の行の書き込み | 10 万 | 5,000 万 |
| ストレージ | 合計 5 GB | 5 GB まで含まれる |
| 超過したとき | その種類の操作がエラーになる（課金はされない） | 従量で課金される。spending limit を設定できる |

- 利用量は家庭用の規模なら Free でも足りる見込み。
- Free の上限を超えると、その日は Fairy が返事をしなくなる。
- Durable Objects の Free のストレージは、Limits ページの表では合計 5 GB、FAQ では 1 GB と書かれていて食い違う。

[^cf-workers-limits]: [Workers: Limits](https://developers.cloudflare.com/workers/platform/limits/)
[^cf-workers-pricing]: [Workers: Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
[^cf-do-pricing]: [Durable Objects: Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
[^cf-do-limits]: [Durable Objects: Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
[^cf-d1-limits]: [D1: Limits](https://developers.cloudflare.com/d1/platform/limits/)
[^cf-d1-pricing]: [D1: Pricing](https://developers.cloudflare.com/d1/platform/pricing/)
[^cf-workers-logs]: [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
