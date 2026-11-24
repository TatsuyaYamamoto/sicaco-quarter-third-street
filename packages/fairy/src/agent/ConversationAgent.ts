/**
 * @file ConversationAgent: 会話（グループや DM）ごとに 1 つ作られ、メッセージへの返信を決める
 *
 * @see docs/phases/phase-1.md の「ConversationAgent の処理フロー」
 */

import { Agent } from "agents";
import { drizzle } from "drizzle-orm/d1";
import fairyMd from "../../../../FAIRY.md";
import { loadConfig } from "../config";
import {
  getAccountsByPerson,
  getRecentMessageHistory,
  resolveAccount,
  resolveConversation,
  saveMessage,
} from "../db/storage";
import { type Role, roleIdentifiedBy } from "../models/person";
import { generateReply } from "./llm";
import { buildConversationPrompt, buildSystemPrompt } from "./prompt";
import type { IncomingMessage, Reply } from "./types";

const systemPrompt = buildSystemPrompt(fairyMd);

export class ConversationAgent extends Agent<Cloudflare.Env> {
  /** メッセージを受け取り、返信の内容を返す。返信しないときは undefined */
  async handleMessage(message: IncomingMessage): Promise<Reply | undefined> {
    const config = loadConfig(this.env);
    const db = drizzle(this.env.DB);

    const [account, conversation] = await Promise.all([
      resolveAccount(
        { platform: message.platform, platformUserId: message.sender.platformUserId },
        db,
      ),
      resolveConversation(
        {
          platform: message.platform,
          platformConversationId: message.conversation.platformConversationId,
          type: message.conversation.type,
        },
        db,
      ),
    ]);

    const savedMessage = await saveMessage(
      {
        conversationId: conversation.id,
        accountId: account.id,
        type: message.message.type,
        text:
          message.message.type === "text"
            ? message.message.text
            : message.message.keywords.join(", ") || null,
        payloadJson: message.message.payloadJson,
        platformMessageId: message.message.platformMessageId,
        createdAt: message.sentAt,
      },
      db,
    );
    if (!savedMessage) {
      // すでに受け取ったメッセージ（Webhook の再送など）なので、二重に返信しない
      return undefined;
    }

    const messageHistory = await getRecentMessageHistory(
      { conversationId: conversation.id, limit: config.HISTORY_LIMIT },
      db,
    );
    const personIds = [
      ...new Set(messageHistory.flatMap(({ personId }) => (personId === null ? [] : [personId]))),
    ];
    const accountsByPerson = await getAccountsByPerson({ personIds }, db);
    const roles = new Map<string, Role>();
    for (const personId of personIds) {
      // Person の Account のどれかが役割を持つ Person を示していれば、その Person はその役割を持つ
      const role = (accountsByPerson.get(personId) ?? [])
        .map((account) => roleIdentifiedBy(account, config))
        .find((role) => role !== null);
      if (role) {
        roles.set(personId, role);
      }
    }

    const reply = await generateReply({
      system: systemPrompt,
      prompt: buildConversationPrompt({
        platform: message.platform,
        conversationType: message.conversation.type,
        messageHistory,
        roles,
      }),
      config,
    });

    if (reply) {
      // 返信の内容を返すのと並行して保存する（docs/phases/phase-1.md の「応答速度と D1 への保存のタイミング」）
      this.ctx.waitUntil(
        saveMessage(
          {
            conversationId: conversation.id,
            accountId: null,
            type: "text",
            text: reply.text,
            payloadJson: JSON.stringify(reply),
            platformMessageId: null,
            createdAt: new Date().toISOString(),
          },
          db,
        ).catch((error: unknown) => console.error("failed to save Fairy's message", error)),
      );
    }
    return reply;
  }
}
