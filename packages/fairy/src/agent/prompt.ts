/**
 * @file LLM に渡すプロンプトの組み立て
 *
 * @see docs/phases/phase-1.md の「プロンプトでの人の表し方」
 */

import type { HistoryMessage } from "../db/storage";

/** 設定値で決まる役割 */
export type Role = "master" | "assistant2";

const ROLE_LABELS = {
  master: "マスター",
  assistant2: "助手二号",
} as const satisfies Record<Role, string>;

const CONVERSATION_TYPE_LABELS = {
  group: "グループ",
  dm: "1 対 1 のトーク",
} as const;

const INSTRUCTIONS = `# 会話への参加

Fairy は LINE の会話に参加している。会話の履歴を読み、最後の発言に対して Fairy が返信するべきかを判断し、返信する場合は返信の文章を書く。

- Fairy に話しかけられているとき、Fairy への質問や依頼があるときは返信する。
- 人どうしのやり取りで、Fairy が口を挟む必要がないときは返信しない。
- 返信の文章は、LINE のメッセージとしてそのまま送られる。人を表す ID（P1 など）は返信の文章に書かない。`;

/** FAIRY.md と会話への参加のしかたから、システムプロンプトを作る */
export const buildSystemPrompt = (fairyMd: string): string => {
  // HTML コメントはオーナーが補足を書くためのもので、Fairy には見せない
  const character = fairyMd.replace(/<!--[\s\S]*?-->/g, "").trim();
  return `${character}\n\n${INSTRUCTIONS}`;
};

/** 会話の場・会話にいる人・会話の履歴から、LLM への入力を作る */
export const buildConversationPrompt = ({
  conversationType,
  history,
  roles,
}: {
  conversationType: "group" | "dm";
  history: HistoryMessage[];
  /** Person の ID ごとの役割。役割のない人は含めない */
  roles: Map<string, Role>;
}): string => {
  // 発言者の ID は、履歴に初めて出てきた順に振る
  const aliases = new Map<string, string>();
  for (const { personId } of history) {
    if (personId !== null && !aliases.has(personId)) {
      aliases.set(personId, `P${aliases.size + 1}`);
    }
  }

  const people = [...aliases].map(([personId, alias]) => {
    const role = roles.get(personId);
    return `- ${alias}: ${role ? ROLE_LABELS[role] : "Fairy がまだ知らない人"}`;
  });

  const lines = history.map(({ personId, type, text }) => {
    const speaker = personId === null ? "Fairy" : aliases.get(personId);
    const body = type === "text" ? (text ?? "") : text ? `（スタンプ: ${text}）` : "（スタンプ）";
    return `[${speaker}] ${body}`;
  });

  return [
    "## 会話の場",
    CONVERSATION_TYPE_LABELS[conversationType],
    "",
    "## この会話にいる人",
    ...people,
    "",
    "## 会話の履歴",
    ...lines,
  ].join("\n");
};
