# 変更履歴

## 2026-11-23

* **Update**: [全体設計](design.md) から「`ConversationAgent` は SQLite-backed の Durable Object で作る」という記述を削除した。新しく作れる Durable Object は SQLite-backed だけで、設計として選ぶものではないため。
* **Update**: [Phase 1 の詳細設計](phases/phase-1.md) の「生成中に新しいメッセージが届いた場合」で、返信を送る呼び出しを決めた。返信は再生成のきっかけになった最新のメッセージの呼び出しが送り、中断された生成を待っていた呼び出しは「返信なし」で終わる。どの呼び出しも待つのを 1 回分の生成時間にとどめ、`ctx.waitUntil` の時間制限（最大 30 秒）に収めるため。再生成の上限に達したあとの振る舞いは、実装が単純になるものにした。
* **Update**: [Phase 1 の詳細設計](phases/phase-1.md) に、LLM の呼び出しのタイムアウト（設定値 `OPENAI_TIMEOUT_SECONDS`、初期値 25 秒）を追加した。`ctx.waitUntil` の時間制限（最大 30 秒）の中に LLM 以外の処理も入るため、5 秒の余裕を残す。
* **Update**: [全体設計](design.md) で、Cloudflare のプランを Workers Paid に決めた。オーナーのアカウントがすでに Workers Paid で、プランはアカウント単位で決まるため。
* **Creation**: [LLM の呼び出し方法の比較](comparison/llm-invocation.md) を作成した。SDK の選択（OpenAI SDK / AI SDK / OpenAI Agents SDK）と経路の選択（直接 / AI Gateway 経由）を分けて比較し、組み合わせの候補も比較した。
* **Update**: [全体設計](design.md) で、LLM の呼び出しを「AI SDK で OpenAI に直接送る」に決めた。要件をすべて公式ドキュメントで確認できたのは直接送る組み合わせだけで、そのうち AI SDK は Agents SDK の MCP クライアントとつながり、モデルも差し替えやすいため。AI Gateway は、経由したときの動作をドキュメントで確認できないため MVP では使わず、MVP ができてから実際に呼んで確かめたうえで改めて検討する（[フェーズ計画](plan.md) の「後のフェーズで決めること」に追加）。

## 2026-11-22

* **Creation**: [Cloudflare Workers のプランの比較](comparison/cloudflare-plans.md) を作成し、Workers Free と Workers Paid の違いを、技術的な制約と利用量の上限に分けて表にした。比較の情報は決定事項ではないため、[全体設計](design.md) から分けて `comparison/` 配下に置く。どちらのプランを使うかは未決。

* **Update**: Phase 1 の「実装の最初に確認すること」を確認し、結果を反映した。`gpt-6-luna` は Structured Outputs に対応している。Durable Objects は無料プランでも SQLite-backed なら使える。LLM の呼び出しには AI SDK（`ai` + `@ai-sdk/openai`）を使うことにした。Agents SDK のモデル層と同じ系統で、要件（構造化出力・中断・reasoning effort）を満たすため。確認が済んだので、「実装の最初に確認すること」の節は削除した。

* **Update**: `DESIGN.md` を `docs/` 配下に分割し、[OKF v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) に沿った構成にした。更新頻度の違う内容（コンセプト・計画・全体設計・フェーズごとの詳細設計）を分け、フェーズが進んでも 1 つのファイルが肥大化しないようにするため。

## 2026-11-21

* **Creation**: 設計書 `DESIGN.md` と、Fairy のキャラクター設定 `FAIRY.md` を作成した。
