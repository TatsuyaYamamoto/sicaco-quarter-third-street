/**
 * @file Agent への入り口。Platform Adapter は、どの `Platform` でもこの関数を呼ぶ
 */

import { createStorage } from "../db/storage";
import { resolveMessage } from "./messageResolver";
import type { PlatformMessage, Reply } from "./types";

/** メッセージを解決・保存して Agent に渡し、返信の内容を受け取る。返信しないときは undefined を返す */
export const dispatchMessage = async (
  env: Env,
  message: PlatformMessage,
): Promise<Reply | undefined> => {
  const resolved = await resolveMessage(createStorage(env.DB), message);
  if (resolved === undefined) {
    return undefined;
  }
  // TODO: ConversationAgent に渡す。それまでは返信しない
  return undefined;
};
