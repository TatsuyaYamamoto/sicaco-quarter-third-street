# 変更履歴

## 2026-11-25

* **Update**: [全体設計](design.md) の「全体アーキテクチャ」を、Platform Adapter・MessageResolver・Agent の 3 つのレイヤーに分けた。Platform Adapter は受け付け判定と `Platform` に依存しない形（`PlatformMessage`）への変換、MessageResolver は `Account`・`Person`・会話の場の解決とメッセージの保存（`ResolvedMessage` を作る）、Agent は会話処理を受け持ち、返信の内容（`Reply`）を返す。`Account` と `Person` の紐付けを LLM で行うと返信に時間がかかるので、Agent に渡す前に引いておくため。MessageResolver は Agent への入り口の関数の中で、Worker で動かす。[Phase 1 の詳細設計](phases/phase-1.md) に「MessageResolver の処理フロー」を追加し、`Account` の解決とメッセージの保存（再送の検知を含む）を ConversationAgent の処理フローから移した。
* **Update**: [全体設計](design.md) の「人の識別モデル」で、`Role`（マスター・助手二号）を設定値ではなく `persons.role` に持つことにした。`Role` は `Person` のものなのに、設定値は `Account` の ID を指していたため、判定が回り道になり、`Platform` ごとに ID を設定する必要もあった。`Role` はオーナーが SQL で設定する。D1 だけに持つので、設定値と食い違う心配もない。あわせて「`Account` と `Person` の紐付け」を追加した。知らない `Account` の `Person` はその場で作り、既存の人と同じだと分かったら結合する。結合のしかたは Phase 5 で決める。
* **Update**: [Phase 1 の詳細設計](phases/phase-1.md) で、受け付け判定を Platform Adapter の責任とし、設定値を `LINE_ALLOWED_CONVERSATION_IDS`（受け付ける会話の ID のリスト）にまとめた。`LINE_USER_ID_MASTER` / `LINE_USER_ID_ASSISTANT2` / `LINE_GROUP_ID_FAMILY` は廃止した。「Fairy と会話できるか」（アクセスの制御）は、「Fairy にとって誰か」（`Role`）とは別の関心事なため。LINE の ID は種類ごとに頭の文字が違うので、DM の相手とグループを 1 つのリストにまとめられる。
* **Update**: [全体設計](design.md) に、メッセージを保存するレイヤーを誰の発言かで分けることを書き足した。人の発言は MessageResolver、Fairy の発言は Agent で保存する。Fairy から話しかけるとき（Phase 4）は MessageResolver を通らないこと、同じ会話の処理が集まる Agent なら、保存中の Fairy の発言が終わってから次の生成を始められることが理由。

## 2026-11-24

* **Update**: [全体設計](design.md) で、AI SDK が既定で使う Vercel の AI Gateway を避ける理由を書き足した。「OpenAI に直接送るため」とだけ書いていて、Cloudflare AI Gateway を経由しないという判断と紛らわしかったため。理由は、クラウドは Cloudflare の製品を前提にしているから。
* **Update**: [Phase 1 の詳細設計](phases/phase-1.md) の「基本の流れ」に、すでに保存しているメッセージを受け取ったときは返信せずに終えることを追加した。Webhook の再送などで、同じメッセージに二重に返信しないため。
* **Update**: [Phase 1 の詳細設計](phases/phase-1.md) で、Fairy の発言を保存するタイミングを「返信を送った後」から「`Reply` を Platform Adapter に返すのと並行して」に変えた。返信を送るのは Platform Adapterで、Agent には送れたかどうかが分からないため。送れたあとにPlatform Adapter から知らせてもらう方式は、Agent を呼ぶ往復が 1 回増えるので採らない。あわせて、シーケンス図で Agent が replyToken を扱っているように見える書き方を直した（replyToken は Platform Adapter だけが持つ）。
* **Update**: [全体設計](design.md) の「人の識別モデル」に「Fairy が覚える人の情報」を追加した。人の情報（呼び名、どういう人か、人と人の関係）は Fairy の目線のもので、Fairy が会話を通じて覚え、開発者やオーナーは直接書き込まない。関係には各人から見た Fairy やほかの人も含む。`Person` は家族に限らず増え、Fairy が書き込むので D1 に持つ。覚える仕組みとデータモデルは Phase 3 で決める（[フェーズ計画](plan.md) の「後のフェーズで決めること」に追加）。
* **Update**: [Phase 1 の詳細設計](phases/phase-1.md) に「プロンプトでの人の表し方」を追加した。履歴の発言者は短い ID で表し、ID と人の対応は別の欄に一度だけ書く。返信の中の人を ID で書かせてあとで呼び名に置き換える方式は採らない。LLM は返信を書くときに相手の `Role` を知っている必要があり、どちらの方式でも対応をプロンプトに入れることになるため。

## 2026-11-23

* **Update**: [Phase 1 の詳細設計](phases/phase-1.md) の「基本の流れ」から、ConversationAgent がプロフィール API で表示名を取得する記述を削除した。Agent はプラットフォームに依存しないという [全体設計](design.md) と食い違っていたため。MVP では Account の表示名は空のままにする。LINE の表示名が Fairy にとっての正しい呼び名とは限らず、呼び名は会話を通じて覚えるため。知らない人の表示名を Fairy が調べる手段は [フェーズ計画](plan.md) の「後のフェーズで決めること」に追加した。
* **Update**: [全体設計](design.md) の「開発ツールとライブラリ」で、LINE Messaging API の型は `@line/bot-sdk` のものを使うことにした。技術選択のときに決めていた内容を、誤って「ライブラリは使わない」と書いていたため。
* **Update**: [Phase 1 の詳細設計](phases/phase-1.md) の「LINE 受け口モジュールの処理フロー」と「会話の受け付け判定」を、LINE 受け口の実装に合わせて補った。テキストとスタンプ以外のメッセージは MVP では保存もせずに無視する（画像は Phase 2 で扱うため）。発言者の userId が含まれないイベントは、発言者を識別できないので無視する。署名が正しくないリクエストには 401 を返す。複数人トークは、家族グループ以外のグループと同じく受け付けない。
* **Update**: [全体設計](design.md) の「開発ツールとライブラリ」に、リポジトリを pnpm workspace の monorepo にし、Worker `fairy` を `packages/fairy` に置くことを追加した。TypeScript と tsconfig はルートで管理し、各パッケージから継承する。今後パッケージが増えたときに、あとから monorepo に移行する手間を避けるため。
* **Update**: [Phase 1 の詳細設計](phases/phase-1.md) の設定値のキーの名前を、`LINE_USER_ID_MASTER` / `LINE_USER_ID_ASSISTANT2` / `LINE_GROUP_ID_FAMILY` に変えた。何の ID かを先に書き、同じ種類の設定が並ぶようにするため。
* **Update**: [全体設計](design.md) を Phase 1 の雛形の実装に合わせて修正した。
  * 「開発ツールとライブラリ」: テストに使うパッケージを `@cloudflare/vitest-plugin` に変えた。`@cloudflare/vitest-pool-workers` は deprecated で、改名されていたため。あわせて、TypeScript の設定に `@tsconfig/strictest` を使うことと、依存のバージョンをすべて固定することを追加した。
  * 「データモデル」: `conversations` の `(platform, platform_conversation_id)` と、`messages` の `(conversation_id, platform_message_id)` を一意にした。同じ会話の場を二重に作らないため、同じメッセージを重複して保存しないため。
* **Update**: [全体設計](design.md) に「開発ツールとライブラリ」の節を追加した。pnpm、oxc（oxlint / oxfmt）、Vitest + `@cloudflare/vitest-pool-workers`、Hono、Drizzle ORM を使い、LINE Messaging API の呼び出しは自前で実装する。Phase 1 の実装を始めるにあたって決めた。
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
