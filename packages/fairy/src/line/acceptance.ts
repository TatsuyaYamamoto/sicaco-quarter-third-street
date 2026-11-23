import type { IncomingMessage } from "../agent/types";
import type { Config } from "../config";

/**
 * 会話を受け付けるかどうかを判定する。受け付けるのは家族グループと、マスター・助手二号との DM だけ
 *
 * @see docs/phases/phase-1.md の「会話の受け付け判定」
 */
export const isAcceptedConversation = (
  conversation: IncomingMessage["conversation"],
  config: Pick<Config, "LINE_GROUP_ID_FAMILY" | "LINE_USER_ID_MASTER" | "LINE_USER_ID_ASSISTANT2">,
): boolean => {
  if (conversation.type === "group") {
    return conversation.platformConversationId === config.LINE_GROUP_ID_FAMILY;
  }
  return [config.LINE_USER_ID_MASTER, config.LINE_USER_ID_ASSISTANT2].includes(
    conversation.platformConversationId,
  );
};
