import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { describe, expect, it } from "vitest";
import { accounts, conversations, messages, persons } from "../src/db/schema";

describe("マイグレーション", () => {
  it("各テーブルに書き込んで読み出せる", async () => {
    const db = drizzle(env.DB);
    const now = new Date().toISOString();
    await db.insert(persons).values({ id: "p1", createdAt: now, updatedAt: now });
    await db.insert(accounts).values({
      id: "a1",
      platform: "line",
      platformUserId: "U1",
      personId: "p1",
      linkedBy: "auto",
      createdAt: now,
    });
    await db.insert(conversations).values({
      id: "c1",
      platform: "line",
      platformConversationId: "C1",
      type: "group",
      createdAt: now,
    });
    await db.insert(messages).values({
      id: "m1",
      conversationId: "c1",
      accountId: "a1",
      type: "text",
      text: "こんにちは",
      payloadJson: "{}",
      platformMessageId: "100",
      createdAt: now,
    });

    expect(await db.select().from(messages)).toHaveLength(1);
  });

  it("同じ会話で同じ platform_message_id は保存できない", async () => {
    const db = drizzle(env.DB);
    const now = new Date().toISOString();
    await db.insert(conversations).values({
      id: "c2",
      platform: "line",
      platformConversationId: "C2",
      type: "group",
      createdAt: now,
    });
    const message = {
      conversationId: "c2",
      type: "text",
      payloadJson: "{}",
      platformMessageId: "100",
      createdAt: now,
    } as const;
    await db.insert(messages).values({ ...message, id: "m2" });

    await expect(db.insert(messages).values({ ...message, id: "m3" })).rejects.toThrow();
  });
});
