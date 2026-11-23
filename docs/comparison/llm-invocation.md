---
type: Comparison
title: LLM の呼び出し方法の比較
description: ConversationAgent から OpenAI を呼ぶときの SDK と経路（直接 / AI Gateway 経由）、その組み合わせの比較
status: draft
sources:
  - id: openai-node
    resource: https://github.com/openai/openai-node
    title: openai/openai-node (GitHub)
  - id: openai-structured-outputs
    resource: https://developers.openai.com/api/docs/guides/structured-outputs
    title: "OpenAI: Structured model outputs"
  - id: openai-reasoning
    resource: https://developers.openai.com/api/docs/guides/reasoning
    title: "OpenAI: Reasoning models"
  - id: ai-sdk-generate-text
    resource: https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text
    title: "AI SDK Core: generateText"
  - id: ai-sdk-openai
    resource: https://ai-sdk.dev/providers/ai-sdk-providers/openai
    title: "AI SDK Providers: OpenAI"
  - id: ai-sdk-mcp
    resource: https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
    title: "AI SDK Core: MCP Tools"
  - id: openai-agents-js-running
    resource: https://openai.github.io/openai-agents-js/guides/running-agents
    title: "OpenAI Agents SDK: Running agents"
  - id: openai-agents-js-cloudflare
    resource: https://openai.github.io/openai-agents-js/extensions/cloudflare
    title: "OpenAI Agents SDK: Cloudflare"
  - id: cf-agents-models
    resource: https://developers.cloudflare.com/agents/models/
    title: "Agents: Models"
  - id: cf-agents-ai-sdk
    resource: https://developers.cloudflare.com/agents/models/ai-sdk/
    title: "Agents: AI SDK provider"
  - id: cf-agents-mcp-client
    resource: https://developers.cloudflare.com/agents/model-context-protocol/apis/client-api/
    title: "Agents: MCP Client API"
  - id: cf-aig-openai
    resource: https://developers.cloudflare.com/ai-gateway/usage/providers/openai/
    title: "AI Gateway: OpenAI"
  - id: cf-aig-pricing
    resource: https://developers.cloudflare.com/ai-gateway/reference/pricing/
    title: "AI Gateway: Pricing"
  - id: cf-aig-unified-billing
    resource: https://developers.cloudflare.com/ai-gateway/features/unified-billing/
    title: "AI Gateway: Unified Billing"
  - id: cf-aig-byok
    resource: https://developers.cloudflare.com/ai-gateway/configuration/bring-your-own-keys/
    title: "AI Gateway: Bring your own keys"
  - id: cf-aig-auth
    resource: https://developers.cloudflare.com/ai-gateway/configuration/authentication/
    title: "AI Gateway: Authentication"
  - id: cf-aig-logging
    resource: https://developers.cloudflare.com/ai-gateway/observability/logging/
    title: "AI Gateway: Logging"
  - id: cf-aig-request-handling
    resource: https://developers.cloudflare.com/ai-gateway/configuration/request-handling/
    title: "AI Gateway: Request handling"
---

# LLM の呼び出し方法の比較

`ConversationAgent`（Cloudflare Agents SDK の Agent クラス）から OpenAI の `gpt-6-luna` を呼ぶ方法を比較する。呼び出し方法は「どの SDK で呼ぶか」と「どこを経由して OpenAI に送るか」の 2 つの選択に分かれる。2026-11-23 時点の公式ドキュメントで確認した。

求めること（[Phase 1 の詳細設計](../phases/phase-1.md) から）:

- Cloudflare Workers（Durable Object）の中で動く
- Structured Outputs（strict の JSON Schema）で `{ should_reply, reply }` を受け取る
- 生成中に新着メッセージが届いたら、進行中のリクエストを `AbortSignal` で中断する
- reasoning effort を柔軟に指定できる（MVP は `none` で始めるが、応答の質に応じて上げ下げする）
- 将来は MCP のツールを使う。OpenAI 以外のモデルに切り替える可能性もある

凡例: ✅ できる / ⚠️ 制約がある / ❌ できない / ❓ 公式ドキュメントに記載がなく未確認

## どの SDK で呼ぶか

| 観点 | OpenAI SDK（`openai`） | AI SDK（`ai` + `@ai-sdk/openai`） | OpenAI Agents SDK（`@openai/agents`） |
| --- | --- | --- | --- |
| 位置づけ | OpenAI の API の公式クライアント | 複数の provider を同じ書き方で呼べる SDK | 推論ループ・ツール実行・handoff などを持つ Agent フレームワーク |
| Agents SDK との関係 | 直接の関係はない | Agents SDK のモデル層（`agents/models/ai-sdk`）は AI SDK の provider として作られていて、`ai` は `agents` の optional peer dependency[^cf-agents-ai-sdk] | Cloudflare のブログに組み合わせの例がある（推論ループを OpenAI Agents SDK、状態を Agents SDK が担う） |
| Cloudflare Workers | ✅ 対応と明記[^openai-node] | ✅ Agents SDK のドキュメントに使用例あり[^cf-agents-models] | ❓ Cloudflare 向けの記載は Realtime（音声）のアダプター（beta）だけで、テキストの Agent は記載なし[^openai-agents-js-cloudflare] |
| Structured Outputs | ✅ `zodTextFormat`[^openai-structured-outputs] | ✅ `Output.object`[^ai-sdk-generate-text]。optional なプロパティは使えず、`.nullable()` で表す[^ai-sdk-openai] | ❓ strict は記載なし |
| `AbortSignal` での中断 | ✅ `signal`[^openai-node] | ✅ `abortSignal`[^ai-sdk-generate-text] | ✅ `signal`[^openai-agents-js-running] |
| reasoning effort の指定 | ✅ `none`〜`max`[^openai-reasoning] | ✅ `none`〜`max`[^ai-sdk-generate-text][^ai-sdk-openai] | ❓ 値の一覧は記載なし |
| MCP | ❓ 記載なし | ✅ Agents SDK の MCP クライアントの `getAITools()` が、MCP のツールを AI SDK の形式に変換する[^cf-agents-mcp-client][^ai-sdk-mcp] | ✅ SDK の機能あり |
| OpenAI 以外のモデル | ⚠️ OpenAI 互換の API だけ[^openai-node] | ✅ provider の差し替え[^ai-sdk-openai] | ✅ 独自の `Model` 実装 |

## どこを経由して OpenAI に送るか

**要件を満たせるか**

| 観点 | OpenAI に直接送る | AI Gateway 経由（AI binding） | AI Gateway 経由（Gateway の URL を指定） |
| --- | --- | --- | --- |
| Responses API | ✅ | ✅[^cf-agents-ai-sdk] | ✅[^cf-aig-openai] |
| Structured Outputs（strict）が届くか | ✅ | ❓ リクエストの本文はそのまま送られる[^cf-agents-ai-sdk]が、strict が届くことの記載はない | ❓ 記載なし |
| reasoning effort の指定が届くか | ✅ | ❓ 届くことの記載はない。`createAI` の `reasoningEffort` オプションはベンダーのモデルでは無視されるので、AI SDK の `reasoning` などで指定する[^cf-agents-ai-sdk] | ❓ 記載なし |
| 中断したときに OpenAI へのリクエストも止まるか | ✅ | ❓ 記載なし。止まらない場合、捨てた生成の料金がかかる | ❓ 左と同じ |
| `gpt-6-luna` を使えるか | ✅ | ❓ 記載なし（ドキュメントの例は `gpt-5.5` などだけ） | ❓ 左と同じ |

**特徴**

| 観点 | OpenAI に直接送る | AI Gateway 経由（AI binding） | AI Gateway 経由（Gateway の URL を指定） |
| --- | --- | --- | --- |
| 呼び方 | `api.openai.com` に送る | `createAI({ binding: env.AI })` にベンダーのモデルを渡す[^cf-agents-ai-sdk] | SDK の `baseURL` に Gateway の URL を指定する[^cf-aig-openai] |
| Gateway への認証 | — | 不要（binding は認証済みとして扱われる）[^cf-aig-auth] | Cloudflare の API トークンを送る。トークンはアカウント内のすべての Gateway に使える[^cf-aig-auth] |
| OpenAI の API キーの置き場所 | Worker の Secrets | Worker の Secrets / Gateway（BYOK）/ 不要（Unified Billing）[^cf-aig-unified-billing][^cf-aig-byok] | 左と同じ |
| 料金 | OpenAI の料金だけ | Gateway は無料[^cf-aig-pricing]。Unified Billing なら手数料 5%[^cf-aig-unified-billing] | 左と同じ |
| 応答速度 | 基準 | 1 段増える（増える時間は記載なし） | 左と同じ |
| 得られる機能 | — | 分析（リクエスト数・トークン数・コスト）、ログ（既定で有効。家族の会話の本文も残る。Gateway の設定かヘッダー `cf-aig-collect-log-payload: false` で止められる[^cf-aig-logging]）、キャッシュ（完全一致のみ。既定で無効）、リトライ[^cf-aig-request-handling]、レート制限、spend の上限、ガードレール | 左と同じ |

- 「利用量が想定より増えていないかの監視」（[後のフェーズで決めること](../plan.md#後のフェーズで決めること)）には、Gateway の分析と spend の上限が使える可能性がある。

## 組み合わせの候補

| 候補 | SDK | 経路 | Workers | Structured Outputs | 中断 | reasoning effort | `gpt-6-luna` | MCP | OpenAI 以外のモデル |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AI SDK | 直接 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | AI SDK | AI Gateway（AI binding） | ✅ | ❓ Gateway 経由は記載なし | ❓ Gateway 経由は記載なし | ❓ Gateway 経由は記載なし | ❓ Gateway 経由は記載なし | ✅ | ✅ |
| 3 | OpenAI SDK | 直接 | ✅ | ✅ | ✅ | ✅ | ✅ | ❓ 記載なし | ⚠️ OpenAI 互換の API だけ |
| 4 | OpenAI SDK | AI Gateway（URL を指定。Cloudflare の API トークンを Worker に置く） | ✅ | ❓ Gateway 経由は記載なし | ❓ Gateway 経由は記載なし | ❓ Gateway 経由は記載なし | ❓ Gateway 経由は記載なし | ❓ 記載なし | ⚠️ OpenAI 互換の API だけ |
| 5 | OpenAI Agents SDK（推論ループなどの機能は、1 回呼ぶだけの用途には使わない） | 直接 / AI Gateway | ❓ Durable Object の中で動くかの記載なし | ❓ strict は記載なし | ✅ 直接 / ❓ Gateway | ❓ 値の一覧は記載なし | ✅ 直接 / ❓ Gateway | ✅ | ✅ |

[^openai-node]: [openai/openai-node (GitHub)](https://github.com/openai/openai-node)
[^openai-structured-outputs]: [OpenAI: Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
[^openai-reasoning]: [OpenAI: Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)
[^ai-sdk-generate-text]: [AI SDK Core: generateText](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
[^ai-sdk-openai]: [AI SDK Providers: OpenAI](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
[^ai-sdk-mcp]: [AI SDK Core: MCP Tools](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools)
[^openai-agents-js-running]: [OpenAI Agents SDK: Running agents](https://openai.github.io/openai-agents-js/guides/running-agents)
[^openai-agents-js-cloudflare]: [OpenAI Agents SDK: Cloudflare](https://openai.github.io/openai-agents-js/extensions/cloudflare)
[^cf-agents-models]: [Agents: Models](https://developers.cloudflare.com/agents/models/)
[^cf-agents-ai-sdk]: [Agents: AI SDK provider](https://developers.cloudflare.com/agents/models/ai-sdk/)
[^cf-agents-mcp-client]: [Agents: MCP Client API](https://developers.cloudflare.com/agents/model-context-protocol/apis/client-api/)
[^cf-aig-openai]: [AI Gateway: OpenAI](https://developers.cloudflare.com/ai-gateway/usage/providers/openai/)
[^cf-aig-pricing]: [AI Gateway: Pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/)
[^cf-aig-unified-billing]: [AI Gateway: Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)
[^cf-aig-byok]: [AI Gateway: Bring your own keys](https://developers.cloudflare.com/ai-gateway/configuration/bring-your-own-keys/)
[^cf-aig-auth]: [AI Gateway: Authentication](https://developers.cloudflare.com/ai-gateway/configuration/authentication/)
[^cf-aig-logging]: [AI Gateway: Logging](https://developers.cloudflare.com/ai-gateway/observability/logging/)
[^cf-aig-request-handling]: [AI Gateway: Request handling](https://developers.cloudflare.com/ai-gateway/configuration/request-handling/)
