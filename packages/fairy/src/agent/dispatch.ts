import type { IncomingMessage, Reply } from "./types";

/** メッセージを Agent に渡し、返信の内容を受け取る */
export const dispatchMessage = async (_env: Env, _message: IncomingMessage): Promise<Reply> => {
  // TODO: ConversationAgent に渡す。それまでは返信しない
  return { type: "none" };
};
