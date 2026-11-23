/**
 * @file 設定値で決まる人の役割（マスター・助手二号）
 *
 * @see docs/design.md の「人の識別モデル」
 */

import type { Config } from "../config";
import type { accounts } from "../db/schema";

/** 設定値で決まる役割 */
export type Role = "master" | "assistant2";

/**
 * Person ごとの役割を、紐付く Account と設定値から決める
 *
 * @see docs/design.md の「概念モデル」
 */
export const resolveRoles = (
  accountsByPerson: Map<string, (typeof accounts.$inferSelect)[]>,
  config: Pick<Config, "LINE_USER_ID_MASTER" | "LINE_USER_ID_ASSISTANT2">,
): Map<string, Role> => {
  const roles = new Map<string, Role>();
  for (const [personId, personAccounts] of accountsByPerson) {
    const lineUserIds = personAccounts
      .filter((account) => account.platform === "line")
      .map((account) => account.platformUserId);
    if (lineUserIds.includes(config.LINE_USER_ID_MASTER)) {
      roles.set(personId, "master");
    } else if (lineUserIds.includes(config.LINE_USER_ID_ASSISTANT2)) {
      roles.set(personId, "assistant2");
    }
  }
  return roles;
};
