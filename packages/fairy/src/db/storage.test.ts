import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { describe, expect, it } from "vitest";
import { persons } from "./schema";
import {
  getAccountsByPerson,
  getRecentMessages,
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
    const created = await resolveAccount(db, { platform: "line", platformUserId }, now);
    const found = await resolveAccount(db, { platform: "line", platformUserId }, now);

    expect(found).toEqual(created);
    expect(created).toMatchObject({ platformUserId, linkedBy: "auto" });
    const person = await db.select().from(persons).all();
    expect(person.some(({ id }) => id === created.personId)).toBe(true);
  });
});

describe("resolveConversation", () => {
  it("同じ会話なら同じものを返す", async () => {
    const key = { platform: "line", platformConversationId: unique("C"), type: "group" } as const;
    const first = await resolveConversation(db, key, now);
    expect(await resolveConversation(db, key, now)).toEqual(first);
  });
});

describe("saveMessage / getRecentMessages", () => {
  const setup = async () => {
    const account = await resolveAccount(
      db,
      { platform: "line", platformUserId: unique("U") },
      now,
    );
    const conversation = await resolveConversation(
      db,
      { platform: "line", platformConversationId: unique("C"), type: "group" },
      now,
    );
    const save = (text: string, createdAt: string, accountId: string | null = account.id) =>
      saveMessage(db, {
        conversationId: conversation.id,
        accountId,
        type: "text",
        text,
        payloadJson: "{}",
        platformMessageId: accountId ? text : null,
        createdAt,
      });
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

    const history = await getRecentMessages(db, conversation.id, 2);
    expect(history).toEqual([
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
    const account = await resolveAccount(
      db,
      { platform: "line", platformUserId: unique("U") },
      now,
    );
    const result = await getAccountsByPerson(db, [account.personId]);
    expect(result.get(account.personId)).toEqual([account]);
  });
});
