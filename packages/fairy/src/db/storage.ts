/**
 * @file D1 への読み書き
 */

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { MessageContent, PlatformMessage, Role } from "../agent/types";
import { accounts, conversations, messages, persons } from "./schema";

/** 解決した `Account` と、紐付く `Person` */
export interface ResolvedAccount {
  accountId: string;
  personId: string;
  role: Role | null;
}

/** 解決した会話の場 */
export interface ResolvedConversation {
  id: string;
  type: "group" | "dm";
}

/** 受け取ったメッセージとして保存する内容 */
export interface IncomingMessageRecord {
  conversationId: string;
  accountId: string;
  content: MessageContent;
  platformMessageId: string;
  payloadJson: string;
  sentAt: string;
}

export interface Storage {
  /** `Account` と、紐付く `Person` を引く。なければ両方を作る */
  resolveAccount: (
    platform: PlatformMessage["platform"],
    platformUserId: string,
  ) => Promise<ResolvedAccount>;
  /** 会話の場を引く。なければ作る */
  resolveConversation: (
    platform: PlatformMessage["platform"],
    conversation: PlatformMessage["conversation"],
  ) => Promise<ResolvedConversation>;
  /** 受け取ったメッセージを保存し、ID を返す。すでに保存していたメッセージなら保存せずに undefined を返す */
  saveIncomingMessage: (record: IncomingMessageRecord) => Promise<string | undefined>;
}

/** メッセージの中身を、`messages.text` に入れる文字列にする。スタンプはキーワードを入れる */
const toMessageText = (content: MessageContent): string | null =>
  content.type === "text" ? content.text : content.keywords.join(", ") || null;

export const createStorage = (d1: D1Database): Storage => {
  const db = drizzle(d1);

  const findAccount = async (
    platform: PlatformMessage["platform"],
    platformUserId: string,
  ): Promise<ResolvedAccount | undefined> => {
    const [row] = await db
      .select({ accountId: accounts.id, personId: persons.id, role: persons.role })
      .from(accounts)
      .innerJoin(persons, eq(accounts.personId, persons.id))
      .where(and(eq(accounts.platform, platform), eq(accounts.platformUserId, platformUserId)));
    return row;
  };

  const findConversation = async (
    platform: PlatformMessage["platform"],
    platformConversationId: string,
  ): Promise<ResolvedConversation | undefined> => {
    const [row] = await db
      .select({ id: conversations.id, type: conversations.type })
      .from(conversations)
      .where(
        and(
          eq(conversations.platform, platform),
          eq(conversations.platformConversationId, platformConversationId),
        ),
      );
    return row;
  };

  return {
    resolveAccount: async (platform, platformUserId) => {
      const found = await findAccount(platform, platformUserId);
      if (found) {
        return found;
      }
      const now = new Date().toISOString();
      const personId = crypto.randomUUID();
      const accountId = crypto.randomUUID();
      try {
        // batch は 1 つのトランザクションなので、Account を作れなければ Person も作られない
        await db.batch([
          db.insert(persons).values({ id: personId, createdAt: now, updatedAt: now }),
          db.insert(accounts).values({
            id: accountId,
            platform,
            platformUserId,
            personId,
            linkedBy: "auto",
            createdAt: now,
          }),
        ]);
        return { accountId, personId, role: null };
      } catch (error) {
        // 同じ Account の最初のメッセージが同時に届くと、もう一方が先に作っていることがある
        const created = await findAccount(platform, platformUserId);
        if (created) {
          return created;
        }
        throw error;
      }
    },

    resolveConversation: async (platform, { platformConversationId, type }) => {
      const found = await findConversation(platform, platformConversationId);
      if (found) {
        return found;
      }
      const id = crypto.randomUUID();
      // 同じ会話の場が同時に作られても、一意制約で 1 つだけ残る
      await db
        .insert(conversations)
        .values({ id, platform, platformConversationId, type, createdAt: new Date().toISOString() })
        .onConflictDoNothing();
      const created = await findConversation(platform, platformConversationId);
      if (!created) {
        throw new Error(`failed to resolve conversation: ${platform} ${platformConversationId}`);
      }
      return created;
    },

    saveIncomingMessage: async (record) => {
      const id = crypto.randomUUID();
      const inserted = await db
        .insert(messages)
        .values({
          id,
          conversationId: record.conversationId,
          accountId: record.accountId,
          type: record.content.type,
          text: toMessageText(record.content),
          payloadJson: record.payloadJson,
          platformMessageId: record.platformMessageId,
          createdAt: record.sentAt,
        })
        // 同じ会話で同じ platform_message_id のメッセージは、一意制約で保存されない
        .onConflictDoNothing()
        .returning({ id: messages.id });
      return inserted[0]?.id;
    },
  };
};
