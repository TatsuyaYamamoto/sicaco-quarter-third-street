import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { describe, expect, it } from "vitest";
import { accounts, conversations, messages, persons } from "../db/schema";
import { createStorage } from "../db/storage";
import { resolveMessage } from "./messageResolver";
import type { MessageContent, PlatformMessage } from "./types";

const db = drizzle(env.DB);
const storage = createStorage(env.DB);

/** テストごとにストレージが分かれないので、ほかのテストと重ならない ID を使う */
const uniqueIds = (): { userId: string; groupId: string } => {
  const suffix = crypto.randomUUID();
  return { userId: `U${suffix}`, groupId: `C${suffix}` };
};

const platformMessage = (
  ids: { userId: string; groupId: string },
  platformMessageId: string,
  content: MessageContent = { type: "text", text: "こんにちは" },
): PlatformMessage => ({
  platform: "line",
  conversation: { type: "group", platformConversationId: ids.groupId },
  sender: { platformUserId: ids.userId },
  message: { ...content, platformMessageId, payloadJson: "{}" },
  sentAt: "2026-11-25T00:00:00.000Z",
});

const countAccounts = async (userId: string): Promise<number> =>
  (await db.select().from(accounts).where(eq(accounts.platformUserId, userId))).length;

describe("resolveMessage", () => {
  it("知らない Account なら Person と一緒に作り、会話の場とメッセージも保存する", async () => {
    const ids = uniqueIds();
    const resolved = await resolveMessage(storage, platformMessage(ids, "1"));

    expect(resolved).toMatchObject({
      conversation: { type: "group" },
      sender: { role: null },
      message: { type: "text", text: "こんにちは" },
      sentAt: "2026-11-25T00:00:00.000Z",
    });
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.platformUserId, ids.userId));
    expect(account).toMatchObject({ id: resolved?.sender.accountId, linkedBy: "auto" });
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.platformConversationId, ids.groupId));
    expect(conversation?.id).toBe(resolved?.conversation.id);
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, resolved?.message.id ?? ""));
    expect(message).toMatchObject({ accountId: account?.id, platformMessageId: "1" });
  });

  it("知っている Account なら、紐付く Person の Role を返す", async () => {
    const ids = uniqueIds();
    const first = await resolveMessage(storage, platformMessage(ids, "1"));
    await db
      .update(persons)
      .set({ role: "master" })
      .where(eq(persons.id, first?.sender.personId ?? ""));

    const second = await resolveMessage(storage, platformMessage(ids, "2"));
    expect(second?.sender).toEqual({ ...first?.sender, role: "master" });
    expect(second?.conversation).toEqual(first?.conversation);
  });

  it("すでに保存しているメッセージなら、保存せずに undefined を返す", async () => {
    const ids = uniqueIds();
    const first = await resolveMessage(storage, platformMessage(ids, "1"));

    expect(await resolveMessage(storage, platformMessage(ids, "1"))).toBeUndefined();
    const saved = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, first?.conversation.id ?? ""));
    expect(saved).toHaveLength(1);
  });

  it.each([
    ["キーワードのあるスタンプは、キーワードを本文として保存する", ["OK", "了解"], "OK, 了解"],
    ["キーワードのないスタンプは、本文を空にする", [], null],
  ])("%s", async (_, keywords, expectedText) => {
    const ids = uniqueIds();
    const resolved = await resolveMessage(
      storage,
      platformMessage(ids, "1", { type: "sticker", keywords }),
    );
    expect(resolved?.message).toMatchObject({ type: "sticker", keywords });
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, resolved?.message.id ?? ""));
    expect(message).toMatchObject({ type: "sticker", text: expectedText });
  });

  it("同じ Account の最初のメッセージが同時に届いても、Account と Person は 1 つだけ作る", async () => {
    const ids = uniqueIds();
    const [a, b] = await Promise.all([
      resolveMessage(storage, platformMessage(ids, "1")),
      resolveMessage(storage, platformMessage(ids, "2")),
    ]);

    expect(a?.sender.personId).toBe(b?.sender.personId);
    expect(a?.conversation.id).toBe(b?.conversation.id);
    expect(await countAccounts(ids.userId)).toBe(1);
  });
});
