/**
 * @file 人の識別モデル: Person（人間）・Account（プラットフォームでのアカウント）と、設定値で決まる役割
 *
 * @see docs/design.md の「人の識別モデル」
 */

import type { Config } from "../config";
import type { accounts, persons } from "../db/schema";

/** Fairy が識別する 1 人の人間 */
export type Person = typeof persons.$inferSelect;

/** あるプラットフォームでの利用者のアカウント。1 人の Person が複数の Account を持つ */
export type Account = typeof accounts.$inferSelect;

/**
 * Person が持つ、設定値で決まる役割。ほとんどの Person は役割を持たない
 *
 * 役割を持つのは Person で、Account ではない。設定値の Account は、役割を持つ Person を識別する手がかり。
 * そのため、別のプラットフォームの Account が同じ Person に紐付けば、その Account からの発言も同じ役割の人の発言になる
 */
export type Role = "master" | "assistant2";

/** 役割を持つ Person を識別するための設定値 */
interface RoleConfig {
  LINE_USER_ID_MASTER: Config["LINE_USER_ID_MASTER"];
  LINE_USER_ID_ASSISTANT2: Config["LINE_USER_ID_ASSISTANT2"];
}

/** Account から、その Account を持つ Person の役割を引く。設定値の Account でなければ null */
export const roleIdentifiedBy = (
  account: { platform: Account["platform"]; platformUserId: Account["platformUserId"] },
  config: RoleConfig,
): Role | null => {
  if (account.platform === "line" && account.platformUserId === config.LINE_USER_ID_MASTER) {
    return "master";
  }
  if (account.platform === "line" && account.platformUserId === config.LINE_USER_ID_ASSISTANT2) {
    return "assistant2";
  }
  return null;
};
