/**
 * @file D1 への読み書き（ストレージモジュール）
 *
 * @see docs/phases/phase-1.md の「ConversationAgent の処理フロー」
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Account } from "../models/person";
import { accounts, conversations, messages, persons } from "./schema";

export type Db = DrizzleD1Database;

type Platform = Account["platform"];

type Message = typeof messages.$inferSelect;
type Conversation = typeof conversations.$inferSelect;

/** 会話の履歴の 1 件。発言者は、Account ではなく Person で表す */
export interface HistoryMessage {
  /** 発言者の Person の ID。Fairy 自身の発言は null */
  personId: Account["personId"] | null;
  type: Message["type"];
  text: Message["text"];
  createdAt: Message["createdAt"];
}

/**
 * Account を取得する。なければ Person と一緒に作る
 *
 * 同じ人のメッセージが別の会話（別の ConversationAgent）で同時に届くと、両方が作ろうとすることがある。
 * そのときは先に作られた Account を使い、使わなかった Person は消す
 */
export const resolveAccount = async (
  db: Db,
  { platform, platformUserId }: { platform: Platform; platformUserId: string },
  now: string,
): Promise<Account> => {
  const where = and(eq(accounts.platform, platform), eq(accounts.platformUserId, platformUserId));
  const existing = await db.select().from(accounts).where(where).get();
  if (existing) {
    return existing;
  }

  const personId = crypto.randomUUID();
  await db.batch([
    db.insert(persons).values({ id: personId, createdAt: now, updatedAt: now }),
    db
      .insert(accounts)
      .values({
        id: crypto.randomUUID(),
        platform,
        platformUserId,
        personId,
        linkedBy: "auto",
        createdAt: now,
      })
      .onConflictDoNothing(),
  ]);
  const account = await db.select().from(accounts).where(where).get();
  if (!account) {
    throw new Error(`failed to create account: ${platform}/${platformUserId}`);
  }
  if (account.personId !== personId) {
    await db.delete(persons).where(eq(persons.id, personId));
  }
  return account;
};

/** 会話の場を取得する。なければ作る */
export const resolveConversation = async (
  db: Db,
  {
    platform,
    platformConversationId,
    type,
  }: { platform: Platform; platformConversationId: string; type: "group" | "dm" },
  now: string,
): Promise<Conversation> => {
  await db
    .insert(conversations)
    .values({ id: crypto.randomUUID(), platform, platformConversationId, type, createdAt: now })
    .onConflictDoNothing();
  const conversation = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.platform, platform),
        eq(conversations.platformConversationId, platformConversationId),
      ),
    )
    .get();
  if (!conversation) {
    throw new Error(`failed to create conversation: ${platform}/${platformConversationId}`);
  }
  return conversation;
};

/**
 * {@link saveMessage} の結果
 *
 * - `saved`: 保存した
 * - `alreadySaved`: 同じメッセージがすでに保存されていたので、保存しなかった
 */
export type SaveMessageResult = "saved" | "alreadySaved";

/**
 * メッセージを保存する。同じ会話で同じ platformMessageId のメッセージがすでにあれば保存しない
 * （LINE が Webhook を再送したときなどに、同じメッセージを二重に処理しないため）
 */
export const saveMessage = async (
  db: Db,
  message: Omit<typeof messages.$inferInsert, "id">,
): Promise<SaveMessageResult> => {
  const inserted = await db
    .insert(messages)
    .values({ id: crypto.randomUUID(), ...message })
    .onConflictDoNothing()
    .returning({ id: messages.id });
  return inserted.length > 0 ? "saved" : "alreadySaved";
};

/** 直近の会話の履歴を、古い順に取得する */
export const getRecentMessages = async (
  db: Db,
  conversationId: string,
  limit: number,
): Promise<HistoryMessage[]> => {
  const rows = await db
    .select({
      personId: accounts.personId,
      type: messages.type,
      text: messages.text,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .leftJoin(accounts, eq(messages.accountId, accounts.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(limit);
  return rows.reverse();
};

/** Person ごとに、紐付く Account を取得する */
export const getAccountsByPerson = async (
  db: Db,
  personIds: string[],
): Promise<Map<string, Account[]>> => {
  const result = new Map<string, Account[]>();
  if (personIds.length === 0) {
    return result;
  }
  const rows = await db.select().from(accounts).where(inArray(accounts.personId, personIds));
  for (const row of rows) {
    result.set(row.personId, [...(result.get(row.personId) ?? []), row]);
  }
  return result;
};
