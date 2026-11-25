---
type: Plan
title: フェーズ計画
description: フェーズごとに実現すること、後のフェーズで決めること
status: draft
---

# フェーズ計画

## フェーズ

| フェーズ | 内容 | 取り組みやすい理由・前提 |
| --- | --- | --- |
| [Phase 1 (MVP)](phases/phase-1.md) | LINE（家族グループ + マスター・助手二号との DM）でテキストとスタンプの会話。短期記憶のみ | — |
| Phase 2 (暫定) | LINE の画像の理解 | 既存の LINE の経路に、画像の取得と画像を扱えるモデルの呼び出しを足すだけで済む |
| Phase 3 (暫定) | 長期記憶（人ごとの好み・出来事などを覚える） | 外部連携が要らない。Phase 1 から保存している会話ログを素材にできる |
| Phase 4 (暫定) | 情報提供・リマインド（天気・予定・ゴミの日など）を LINE で自発的に送る | Cron Triggers と LINE Push API で作れる。Push の無料通数の上限への対応が必要 |
| Phase 5 (暫定) | 専用 UI（iPad / スマホで使う Web アプリ。テキストでの会話） | Cloudflare 上で完結する。2 つ目の `Platform` になるので、同一人物の判定と `Person` の結合（[`Account` と `Person` の紐付け](design.md#account-と-person-の紐付け)）もここで実装する |
| Phase 6 (暫定) | iPad での音声のやり取り | Phase 5 の UI に音声入出力 (STT / TTS) を足す。ブラウザでの常時待ち受けなど検証項目が多い |
| Phase 7 (暫定) | 音声での自発的な話しかけ | Phase 4 と Phase 6 の組み合わせ |
| Phase 8 (暫定) | スマートホーム操作 | 自宅 LAN 内の機器につなぐ仕組み（Tunnel・自宅に置くマシンなど）が必要。構成がまだ決まっていない |
| Phase 9 (暫定) | 見守り・記録（在室状況・センサー情報など） | Phase 8 の仕組みとセンサー機器が前提 |

## 後のフェーズで決めること

- [ ] Phase 2 以降の内容と順番の確定
- [ ] 長期記憶の方式（要約・ベクトル検索 (Vectorize) など）（Phase 3）
- [ ] 自発的な話しかけで LINE Push API を使う場合の、無料通数の上限への対応（Phase 4、[Platform Adapter (LINE) の処理フロー](phases/phase-1.md#platform-adapter-line-の処理フロー)）
- [ ] iPad で音声をやり取りする方式（STT / TTS をどこで処理するか）（Phase 6）
- [ ] スマートホーム機器の構成と、自宅 LAN 内の機器へのつなぎ方（Phase 8）
- [ ] 環境をまたいで同一人物を判定し、`Person` を結合するしかた（誰の承認で結合するか、Fairy が覚えた情報のまとめ方）（Phase 5。[`Account` と `Person` の紐付け](design.md#account-と-person-の紐付け)）
- [ ] LINE 以外の `Platform` で「アカウント」を何で表すか（[概念モデル](design.md#概念モデル)）
- [ ] 家族グループ以外のグループへの参加の可否と、その管理方法（[会話の受け付け判定](phases/phase-1.md#会話の受け付け判定)）
- [ ] Fairy が人の情報（呼び名、どういう人か、Fairy の目線での人と人の関係）を会話から覚える仕組みと、D1 でのデータモデル（Phase 3。[Fairy が覚える人の情報](design.md#fairy-が覚える人の情報)）
- [ ] 知らない人の LINE の表示名を Fairy が調べる手段（ツールなど）。Platform Adapter から Agent に渡す入力には表示名を含めない（[基本の流れ](phases/phase-1.md#基本の流れ)）
- [ ] OpenAI の使用量の監視方法（[LLM のモデルと会話履歴の件数](phases/phase-1.md#llm-のモデルと会話履歴の件数)）
- [ ] Cloudflare AI Gateway を経由するか。経由したときの動作（構造化出力・reasoning effort の指定が届くか、中断が伝わるか、`gpt-6-luna` を使えるか）を、MVP ができてから実際に呼んで確かめる。使用量の監視に使える可能性もある（[LLM の呼び出し方法の比較](comparison/llm-invocation.md)）
