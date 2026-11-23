import { getAgentByName } from "agents";
import type { IncomingMessage, Reply } from "./types";

/** メッセージを、その会話の ConversationAgent に渡し、返信の内容を受け取る */
export const dispatchMessage = async (env: Env, message: IncomingMessage): Promise<Reply> => {
  // ConversationAgent は会話ごとに 1 つ。プラットフォームと会話の ID で決める
  const agent = await getAgentByName(
    env.CONVERSATION_AGENT,
    `${message.platform}:${message.conversation.platformConversationId}`,
  );
  return agent.handleMessage(message);
};
