import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// テーブル定義は docs/design.md の「データモデル」を参照

export const persons = sqliteTable("persons", {
  id: text("id").primaryKey(),
  name: text("name"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    platform: text("platform", { enum: ["line"] }).notNull(),
    platformUserId: text("platform_user_id").notNull(),
    displayName: text("display_name"),
    personId: text("person_id")
      .notNull()
      .references(() => persons.id),
    linkedBy: text("linked_by", { enum: ["auto", "fairy_inference"] }).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("accounts_platform_user_unique").on(t.platform, t.platformUserId),
    index("accounts_person_id_idx").on(t.personId),
  ],
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    platform: text("platform", { enum: ["line"] }).notNull(),
    platformConversationId: text("platform_conversation_id").notNull(),
    type: text("type", { enum: ["group", "dm"] }).notNull(),
    label: text("label"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("conversations_platform_conversation_unique").on(
      t.platform,
      t.platformConversationId,
    ),
  ],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id),
    // Fairy 自身の発言は NULL
    accountId: text("account_id").references(() => accounts.id),
    type: text("type", { enum: ["text", "sticker"] }).notNull(),
    text: text("text"),
    payloadJson: text("payload_json").notNull(),
    platformMessageId: text("platform_message_id"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    // 直近 N 件の履歴の取得に使う
    index("messages_conversation_created_idx").on(t.conversationId, t.createdAt),
    // 重複受信の検知に使う（NULL 同士は重複とみなされない）
    uniqueIndex("messages_conversation_platform_message_unique").on(
      t.conversationId,
      t.platformMessageId,
    ),
  ],
);
