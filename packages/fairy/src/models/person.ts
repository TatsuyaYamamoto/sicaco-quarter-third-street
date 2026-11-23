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

/** 設定値で決まる役割。ほとんどの Person は役割を持たない */
export type Role = "master" | "assistant2";

type RoleConfig = Pick<Config, "LINE_USER_ID_MASTER" | "LINE_USER_ID_ASSISTANT2">;

/** Account の役割を、設定値から決める。役割がなければ null */
export const roleOfAccount = (
  account: Pick<Account, "platform" | "platformUserId">,
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

/**
 * Person の役割を、紐付く Account から決める。どれかの Account に役割があれば、その役割を持つ。役割がなければ null
 *
 * 役割は Person 単位で効くので、別のプラットフォームの Account が同じ Person に紐付けば、その Account からの発言も同じ役割になる
 */
export const roleOfPerson = (
  personAccounts: Pick<Account, "platform" | "platformUserId">[],
  config: RoleConfig,
): Role | null => {
  const roles = personAccounts.map((account) => roleOfAccount(account, config));
  if (roles.includes("master")) {
    return "master";
  }
  if (roles.includes("assistant2")) {
    return "assistant2";
  }
  return null;
};
