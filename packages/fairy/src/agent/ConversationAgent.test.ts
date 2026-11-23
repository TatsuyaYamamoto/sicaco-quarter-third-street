import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testSecrets } from "../../test/secrets";
import { accounts, conversations, messages } from "../db/schema";
import { resolveRoles } from "./ConversationAgent";
import { dispatchMessage } from "./dispatch";
import type { IncomingMessage } from "./types";

const db = drizzle(env.DB);

/** OpenAI の Responses API のレスポンス。output_text に構造化出力の JSON を入れる */
const openaiResponse = (output: { should_reply: boolean; reply: string | null }): Response =>
  Response.json({
    id: "resp_1",
    created_at: 0,
    model: "gpt-6-luna",
    output: [
      {
        type: "message",
        role: "assistant",
        id: "msg_1",
        content: [{ type: "output_text", text: JSON.stringify(output), annotations: [] }],
      },
    ],
    usage: { input_tokens: 1, output_tokens: 1 },
  });

// テストごとにはストレージが分かれないので、ほかのテストと ID が重ならないようにする
let seq = 0;
const textMessage = (text: string): IncomingMessage => {
  seq += 1;
  return {
    platform: "line",
    conversation: {
      type: "dm",
      platformConversationId: `${testSecrets.LINE_USER_ID_MASTER}-${seq}`,
    },
    sender: { platformUserId: testSecrets.LINE_USER_ID_MASTER },
    message: { type: "text", text, platformMessageId: `agent-${seq}`, payloadJson: "{}" },
    sentAt: new Date().toISOString(),
  };
};

const savedTexts = async (platformConversationId: string): Promise<(string | null)[]> => {
  const rows = await db
    .select({ text: messages.text, accountId: messages.accountId })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(eq(conversations.platformConversationId, platformConversationId))
    .orderBy(messages.createdAt);
  return rows.map(({ text }) => text);
};

describe("ConversationAgent", () => {
  let fetchMock: ReturnType<typeof vi.spyOn<typeof globalThis, "fetch">>;

  beforeEach(() => {
    fetchMock = vi
      .spyOn(globalThis, "fetch")
      // Response は呼ばれたときに作る。Durable Object の外で作った Response の本文は、Durable Object の中から読めないため
      .mockImplementation(async () =>
        openaiResponse({ should_reply: true, reply: "はい、マスター。" }),
      );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("メッセージを保存して返信を生成し、Fairy の発言も保存する", async () => {
    const message = textMessage("おはよう");
    const reply = await dispatchMessage(env, message);

    expect(reply).toEqual({ type: "text", text: "はい、マスター。" });
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(JSON.stringify(request)).toContain("- P1: マスター");
    expect(JSON.stringify(request)).toContain("[P1] おはよう");
    // Fairy の発言は返信を返すのと並行して保存するので、保存されるまで待つ
    await vi.waitFor(async () =>
      expect(await savedTexts(message.conversation.platformConversationId)).toEqual([
        "おはよう",
        "はい、マスター。",
      ]),
    );
  });

  it("返信しないときは、Fairy の発言を保存しない", async () => {
    fetchMock.mockImplementation(async () => openaiResponse({ should_reply: false, reply: null }));
    const message = textMessage("独り言");
    expect(await dispatchMessage(env, message)).toEqual({ type: "none" });
    expect(await savedTexts(message.conversation.platformConversationId)).toEqual(["独り言"]);
  });

  it("すでに受け取ったメッセージには返信しない", async () => {
    const message = textMessage("再送");
    await dispatchMessage(env, message);
    expect(await dispatchMessage(env, message)).toEqual({ type: "none" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("resolveRoles", () => {
  const account = (personId: string, platformUserId: string): typeof accounts.$inferSelect => ({
    id: `a-${personId}`,
    platform: "line",
    platformUserId,
    displayName: null,
    personId,
    linkedBy: "auto",
    createdAt: "",
  });

  it("設定値の LINE userId と一致する Account を持つ Person に役割を付ける", () => {
    const roles = resolveRoles(
      new Map([
        ["p1", [account("p1", testSecrets.LINE_USER_ID_MASTER)]],
        ["p2", [account("p2", testSecrets.LINE_USER_ID_ASSISTANT2)]],
        ["p3", [account("p3", "Uother")]],
      ]),
      testSecrets,
    );
    expect(roles).toEqual(
      new Map([
        ["p1", "master"],
        ["p2", "assistant2"],
      ]),
    );
  });
});
