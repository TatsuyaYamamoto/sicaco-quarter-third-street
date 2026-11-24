import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { describe, expect, it } from "vitest";
import { persons } from "./schema";
import {
  getAccountsByPerson,
  getRecentMessageHistory,
  resolveAccount,
  resolveConversation,
  saveMessage,
} from "./storage";

const db = drizzle(env.DB);
const now = "2026-11-24T00:00:00.000Z";

// テストごとにはストレージが分かれないので、ほかのテストと ID が重ならないようにする
let seq = 0;
const unique = (prefix: string): string => `${prefix}-storage-${++seq}`;

describe("resolveAccount", () => {
  it("なければ Person と一緒に作り、あればそれを返す", async () => {
    const platformUserId = unique("U");
    const created = await resolveAccount({ platform: "line", platformUserId }, db);
    const found = await resolveAccount({ platform: "line", platformUserId }, db);

    expect(found).toEqual(created);
    expect(created).toMatchObject({ platformUserId, linkedBy: "auto" });
    const person = await db.select().from(persons).all();
    expect(person.some(({ id }) => id === created.personId)).toBe(true);
  });
});

describe("resolveConversation", () => {
  it("同じ会話なら同じものを返す", async () => {
    const key = { platform: "line", platformConversationId: unique("C"), type: "group" } as const;
    const first = await resolveConversation(key, db);
    expect(await resolveConversation(key, db)).toEqual(first);
  });
});

describe("saveMessage / getRecentMessageHistory", () => {
  const setup = async () => {
    const account = await resolveAccount({ platform: "line", platformUserId: unique("U") }, db);
    const conversation = await resolveConversation(
      { platform: "line", platformConversationId: unique("C"), type: "group" },
      db,
    );
    const save = (text: string, createdAt: string, accountId: string | null = account.id) =>
      saveMessage(
        {
          conversationId: conversation.id,
          accountId,
          type: "text",
          text,
          payloadJson: "{}",
          platformMessageId: accountId ? text : null,
          createdAt,
        },
        db,
      );
    return { account, conversation, save };
  };

  it("保存したメッセージを返す。同じ platformMessageId のメッセージは保存せず、undefined を返す", async () => {
    const { save } = await setup();
    expect(await save("m1", now)).toMatchObject({ text: "m1", platformMessageId: "m1" });
    expect(await save("m1", now)).toBeUndefined();
  });

  it("直近の件数だけを古い順に返す。Fairy の発言は personId が null", async () => {
    const { account, conversation, save } = await setup();
    await save("m1", "2026-11-24T00:00:01.000Z");
    await save("m2", "2026-11-24T00:00:02.000Z");
    await save("fairy", "2026-11-24T00:00:03.000Z", null);

    const messageHistory = await getRecentMessageHistory(
      { conversationId: conversation.id, limit: 2 },
      db,
    );
    expect(messageHistory).toEqual([
      {
        personId: account.personId,
        type: "text",
        text: "m2",
        createdAt: "2026-11-24T00:00:02.000Z",
      },
      { personId: null, type: "text", text: "fairy", createdAt: "2026-11-24T00:00:03.000Z" },
    ]);
  });
});

describe("getAccountsByPerson", () => {
  it("Person ごとに Account をまとめる", async () => {
    const account = await resolveAccount({ platform: "line", platformUserId: unique("U") }, db);
    const result = await getAccountsByPerson({ personIds: [account.personId] }, db);
    expect(result.get(account.personId)).toEqual([account]);
  });
});
