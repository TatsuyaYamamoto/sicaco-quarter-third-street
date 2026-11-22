---
type: Phase Design
title: Phase 1 (MVP) の詳細設計
description: LINE（家族グループ + マスター・助手二号との DM）でのテキストとスタンプの会話
status: draft
sources:
  - id: openai-pricing
    resource: https://developers.openai.com/api/docs/pricing
    title: OpenAI API Pricing
  - id: openai-models
    resource: https://developers.openai.com/api/docs/models
    title: OpenAI Models
  - id: openai-deprecations
    resource: https://developers.openai.com/api/docs/deprecations
    title: OpenAI Deprecations
  - id: cf-env-vars
    resource: https://developers.cloudflare.com/workers/configuration/environment-variables/
    title: "Cloudflare Workers: Environment variables"
  - id: cf-secrets
    resource: https://developers.cloudflare.com/workers/configuration/secrets/
    title: "Cloudflare Workers: Secrets"
---

# Phase 1 (MVP) の詳細設計

フェーズをまたいで使う設計は [全体設計](../design.md) を参照。

## 要件

- Fairy は LINE の **家族グループ** と、**マスター・助手二号との DM** でだけ会話する（詳細は [会話の受け付け判定](#会話の受け付け判定)）。
- 会話に投稿された **すべてのメッセージを LLM で判定し**、応答が必要なときだけ返信する。
- 家族同士のやり取りも保存し、文脈として参照してよい。
- 扱う入力はテキストとスタンプ。**[MVP]**
- 記憶は短期（直近の会話履歴）のみ。**[MVP]** ただし長期記憶を後から追加できる構造にしておく。
- 会話ログは **無期限で保存** する（将来の長期記憶の素材にする）。
- Fairy の回答が完了する前に新しいメッセージが届いたら、**そのメッセージも踏まえて回答する**。

## 構成

```mermaid
flowchart LR
    LINE[LINE Platform]
    subgraph CF[Cloudflare]
        subgraph W[Worker: fairy]
            LM[LINE 受け口モジュール<br/>署名検証・イベント変換・返信送信]
            AG[Agent モジュール<br/>ConversationAgent<br/>Durable Object・会話ごとに 1 インスタンス]
            ST[ストレージモジュール<br/>D1 へのアクセス]
        end
        D1[(D1)]
    end
    OAI[OpenAI API]

    LINE -- Webhook --> LM
    LM -- 会話ごとに振り分け --> AG
    AG -- 保存・履歴の取得 --> ST
    ST --> D1
    AG -- 応答の判定と生成 --> OAI
    AG -- 返信内容 --> LM
    LM -- Reply API --> LINE
```

| 要素 | 役割 |
| --- | --- |
| Worker (`fairy`) | デプロイ単位。以下のモジュールを含む |
| └ LINE 受け口モジュール | LINE とのやり取り（[LINE 受け口モジュールの処理フロー](#line-受け口モジュールの処理フロー)） |
| └ Agent モジュール (`ConversationAgent`) | Agents SDK の Agent クラス（Durable Object）。会話（グループや DM）ごとに 1 インスタンス（[ConversationAgent の処理フロー](#conversationagent-の処理フロー)） |
| └ ストレージモジュール | D1 への読み書きをまとめる |
| D1 | Person / Account / 会話 / メッセージを保存する（[データモデル](../design.md#データモデル)） |

## LINE 受け口モジュールの処理フロー

1. Webhook を受け取って署名 (`x-line-signature`) を検証し、すぐに 200 を返す（以降の処理は `ctx.waitUntil` で行う）。
2. メッセージイベント以外（join / memberJoined / leave / memberLeft など）は無視する。**[MVP]**
   - Person / Account は、メッセージを受信したときに「なければ作る」（[基本の流れ](#基本の流れ)の 1）ので、最初に発言した時点で必ず登録される。一度も発言しない人は Fairy にとって識別する必要がない。
   - 家族グループの groupId もメッセージイベントの `source.groupId` から分かる。
3. 会話を受け付けるかどうかを判定する（[会話の受け付け判定](#会話の受け付け判定)）。受け付けない会話は破棄する。
4. 会話の ID（groupId または DM 相手の userId）に対応する ConversationAgent にイベントを渡す。
5. ConversationAgent から返信内容を受け取ったら、Reply API で送る。
   - Push API は無料で送れる通数に上限があるため、MVP では使わない。**[MVP]**

## ConversationAgent の処理フロー

### 基本の流れ

1. **送信者の Account / Person を解決する**。D1 になければその場で作成する（表示名はプロフィール API で取得する）。
2. **受信したメッセージを D1 に保存する**。スタンプは `packageId` / `stickerId` と、Webhook に含まれる場合は `keywords` を保存し、LLM にはキーワードをテキストとして渡す。
3. 直近 N 件の会話履歴・`FAIRY.md`・人の情報からプロンプトを作る。
4. LLM に **応答の要否と応答文を 1 回の呼び出しで** 出力させる（Structured Outputs、例: `{ should_reply: boolean, reply: string }`）。判定と生成を別々に呼ぶより呼び出し回数が少なく、コストを抑えられる。
5. `should_reply` が true なら、返信内容を LINE 受け口モジュールに渡して Reply API で送ってもらい、Fairy の発言を D1 に保存する。

### 生成中に新しいメッセージが届いた場合

ConversationAgent は「生成中かどうか」と「最後に受け取ったメッセージ」を記録している。生成中に新しいメッセージが届いたら、**進行中の生成を中断し、最新の履歴で生成し直す**。

```mermaid
sequenceDiagram
    participant L as LINE
    box Worker: fairy
        participant LM as LINE 受け口モジュール
        participant A as ConversationAgent
        participant S as ストレージモジュール
    end
    participant D as D1
    participant O as OpenAI

    L->>LM: メッセージ m1
    LM-->>L: 200
    LM->>A: m1
    A->>S: m1 を保存
    S->>D: INSERT
    A->>O: 生成（履歴: 〜m1）
    L->>LM: メッセージ m2
    LM-->>L: 200
    LM->>A: m2
    A->>S: m2 を保存
    S->>D: INSERT
    Note over A: 生成中に新着あり → 進行中の生成を中断して再生成
    A->>O: 再生成（履歴: 〜m2）
    O-->>A: 応答（〜m2 ベース）
    A->>LM: 返信内容（m2 の replyToken）
    LM->>L: Reply API
    A->>S: Fairy の発言を保存
    S->>D: INSERT
```

- 返信には **最新のメッセージの replyToken** を使う（replyToken はメッセージイベントごとに発行される）。
- 中断は、進行中の OpenAI へのリクエストを `AbortController` で止めて行う。応答を待ってから捨てるより待ち時間が短い。
- 再生成の回数には上限を設ける（設定値 `MAX_REGENERATIONS`、[設定値](#設定値)）。上限に達したら、その時点の応答で返信する。
  - 再生成のきっかけは常に新着メッセージなので、返信に使う replyToken は「最後のメッセージを受け取ってから 1 回分の生成時間」しか経っていない。そのため、再生成が続いても replyToken が古くなることはない。

### 応答速度と D1 への保存のタイミング

応答速度への影響が最も大きいのは LLM の呼び出し（数秒）で、D1 への書き込みは数〜数十ミリ秒程度と見込んでいる。そのため次のようにする。

- **受信メッセージは LLM を呼ぶ前に保存する**。上の「生成中の新着」の検知と再生成には最新の履歴が必要なこと、LLM の呼び出しが失敗してもログが残ることが理由。
- **Fairy の発言は返信を送った後に保存する**（応答時間に影響しない）。
- 1 と 2（Account の解決とメッセージの保存）と履歴の取得は、並列にできる部分は並列に行う。
- さらに速くする必要が出てきたら、直近の履歴を Durable Object 内にキャッシュし、D1 からの読み出しを省く。

## 会話の受け付け判定

| 会話の種類 | 扱い |
| --- | --- |
| 家族グループ（設定値の groupId と一致） | 受け付ける |
| マスター・助手二号との DM | 受け付ける |
| それ以外の人との DM | 応答しない。保存もしない |
| 家族グループ以外のグループ | 退出はせず、応答しない。保存もしない。**[MVP]** 将来は `conversations` テーブルで受け付けるグループを管理できるようにする（管理方法は **[未決]**） |

## LLM のモデルと会話履歴の件数

**[MVP]** 値は設定値で変えられるようにする（[設定値](#設定値)）。

| 項目 | 値 |
| --- | --- |
| モデル | `gpt-6-luna` |
| reasoning effort | `none`（応答速度とコストを優先。応答の質が足りなければ `low` に上げる） |
| 会話履歴の件数 N | 30 件 |

**モデルを `gpt-6-luna` にする理由**（2026-11-22 時点の OpenAI 公式ページで確認[^openai-pricing][^openai-models][^openai-deprecations]）

| モデル | 入力 / キャッシュ入力 / 出力（1M トークンあたり） | 状態 |
| --- | --- | --- |
| `gpt-5-nano` | $0.05 / $0.005 / $0.40 | 2026-12-11 に提供終了。後継は `gpt-6-luna` |
| **`gpt-6-luna`** | **$0.10 / $0.01 / $0.50** | 現行。OpenAI が「最も効率的なモデル」としている |
| `gpt-5.6-luna` | $0.20 / $0.02 / $1.20 | 現行 |
| `gpt-5.4-nano` | $0.20 / $0.02 / $1.25 | 2027-04-01 に提供終了 |

- 単価が最も安い `gpt-5-nano` は数週間後に提供終了するため、現行モデルで最も安い `gpt-6-luna` を選ぶ。
- 画像入力にも対応しているため、Phase 2（画像の理解）でもモデルを変えずに済む見込み。
- Structured Outputs に対応しているかは要確認（[実装の最初に確認すること](#実装の最初に確認すること)）。

**コストの試算**（利用量は仮定）

- 1 回の呼び出し: 入力 約 4,000 トークン（`FAIRY.md` 約 2,000 + 履歴 30 件 約 1,500 + その他）、出力 約 150 トークンと仮定すると、約 $0.0005。
- 1 日 100 メッセージ（再生成を含む）なら、月 3,000 回で **約 $1.5（約 230 円）**。
- `FAIRY.md` などのプロンプトの先頭部分は毎回同じなので、キャッシュ入力の料金（通常の 1/10）が適用されれば、さらに安くなる。
- 予算（月 2,000 円）に対して十分に余裕がある。ただし、全メッセージを判定し、さらに再生成もあるため、利用量が想定より増えていないか監視する（監視方法は [後のフェーズで決めること](../plan.md#後のフェーズで決めること)）。

**会話履歴を 30 件にする理由**

- グループでは複数人の発言が入り混じるため、1:1 より多めに必要になる。30 件あれば、数人で何往復かした話題をひと通り含められる。
- 日本語の短い発言なら 30 件で 1,000〜2,000 トークン程度で、コストへの影響は小さい。

## 設定値

種類の `vars` は Environment variables[^cf-env-vars]、`secrets` は Secrets[^cf-secrets] を指す。

| キー | 内容 | 種類 | 初期値 |
| --- | --- | --- | --- |
| `LINE_CHANNEL_SECRET` | LINE の Channel Secret（署名検証に使う） | secrets | — |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE の Channel Access Token（返信・プロフィール取得に使う） | secrets | — |
| `OPENAI_API_KEY` | OpenAI の API Key | secrets | — |
| `LINE_MASTER_USER_ID` | マスターの LINE userId | secrets | — |
| `LINE_ASSISTANT2_USER_ID` | 助手二号の LINE userId | secrets | — |
| `LINE_FAMILY_GROUP_ID` | 家族グループの groupId。**[MVP]** 受け付けるグループを `conversations` テーブルで管理するようになったら不要になる | secrets | — |
| `OPENAI_MODEL` | LLM のモデル（[LLM のモデルと会話履歴の件数](#llm-のモデルと会話履歴の件数)） | vars | `gpt-6-luna` **[MVP]** |
| `OPENAI_REASONING_EFFORT` | reasoning effort（[LLM のモデルと会話履歴の件数](#llm-のモデルと会話履歴の件数)） | vars | `none` **[MVP]** |
| `HISTORY_LIMIT` | プロンプトに入れる会話履歴の件数（[LLM のモデルと会話履歴の件数](#llm-のモデルと会話履歴の件数)） | vars | `30` **[MVP]** |
| `MAX_REGENERATIONS` | 再生成の回数の上限（[生成中に新しいメッセージが届いた場合](#生成中に新しいメッセージが届いた場合)） | vars | `10` **[MVP]** |

## FAIRY.md の取り込み

- [`FAIRY.md`](../../FAIRY.md) はリポジトリで管理し、ビルド時に文字列として Worker に取り込んでシステムプロンプトに使う。
- `FAIRY.md` 内の HTML コメント（`<!-- ... -->`）は、オーナーが内容の補足（出典・元のセリフなど）を書くためのもの。システムプロンプトに入れる前に取り除く。

## 実装の最初に確認すること

- [ ] `gpt-6-luna` が Structured Outputs に対応しているか（[LLM のモデルと会話履歴の件数](#llm-のモデルと会話履歴の件数)）
- [ ] Durable Objects を無料プランで使えるか（[Durable Object を使う理由](../design.md#durable-object-を使う理由)）
- [ ] LLM の呼び出しに使う SDK の組み合わせ（[Agent フレームワーク](../design.md#agent-フレームワークとして-cloudflare-agents-sdk-を最初から最小限使う)）

[^openai-pricing]: [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing)
[^openai-models]: [OpenAI Models](https://developers.openai.com/api/docs/models)
[^openai-deprecations]: [OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations)
[^cf-env-vars]: [Cloudflare Workers: Environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
[^cf-secrets]: [Cloudflare Workers: Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
