/**
 * @file MessageResolver: PlatformMessage の `Account`・`Person`・会話の場を解決し、保存して ResolvedMessage にする
 *
 * @see docs/phases/phase-1.md の「MessageResolver の処理フロー」
 */

import type { Storage } from "../db/storage";
import type { PlatformMessage, ResolvedMessage } from "./types";

/** メッセージを解決して保存する。すでに保存していたメッセージ（Webhook の再送など）なら undefined を返す */
export const resolveMessage = async (
  storage: Storage,
  message: PlatformMessage,
): Promise<ResolvedMessage | undefined> => {
  const [account, conversation] = await Promise.all([
    storage.resolveAccount(message.platform, message.sender.platformUserId),
    storage.resolveConversation(message.platform, message.conversation),
  ]);

  const { platformMessageId, payloadJson, ...content } = message.message;
  const messageId = await storage.saveIncomingMessage({
    conversationId: conversation.id,
    accountId: account.accountId,
    content,
    platformMessageId,
    payloadJson,
    sentAt: message.sentAt,
  });
  if (messageId === undefined) {
    return undefined;
  }

  return {
    conversation,
    sender: account,
    message: { ...content, id: messageId },
    sentAt: message.sentAt,
  };
};
