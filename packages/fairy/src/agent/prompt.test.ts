import { describe, expect, it } from "vitest";
import { buildConversationPrompt, buildSystemPrompt } from "./prompt";

describe("buildSystemPrompt", () => {
  it("FAIRY.md の HTML コメントを取り除く", () => {
    const prompt = buildSystemPrompt("<!--\n補足\n-->\n# Fairy\n本文<!-- 出典 -->");
    expect(prompt).not.toContain("補足");
    expect(prompt).not.toContain("出典");
    expect(prompt.startsWith("# Fairy\n本文")).toBe(true);
  });
});

describe("buildConversationPrompt", () => {
  it("発言者を ID で表し、ID と人の対応を別の欄に書く", () => {
    const prompt = buildConversationPrompt({
      platform: "line",
      conversationType: "group",
      history: [
        { personId: "p-master", type: "text", text: "おはよう", createdAt: "" },
        { personId: "p-unknown", type: "sticker", text: "OK, 了解", createdAt: "" },
        { personId: null, type: "text", text: "肯定。", createdAt: "" },
        { personId: "p-master", type: "sticker", text: null, createdAt: "" },
      ],
      roles: new Map([["p-master", "master"]]),
    });

    expect(prompt).toBe(
      [
        "## 会話の場",
        "LINE のグループ",
        "",
        "## この会話にいる人",
        "- P1: マスター",
        "- P2: Fairy がまだ知らない人",
        "",
        "## 会話の履歴",
        "[P1] おはよう",
        "[P2] （スタンプ: OK, 了解）",
        "[Fairy] 肯定。",
        "[P1] （スタンプ）",
      ].join("\n"),
    );
  });
});
