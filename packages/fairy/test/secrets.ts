/**
 * @file テストで使う secrets の値。vitest の設定でバインディングとして渡すので、Workers のランタイムに依存するものを import しない
 */

export const testSecrets = {
  LINE_CHANNEL_SECRET: "test-channel-secret",
  LINE_CHANNEL_ACCESS_TOKEN: "test-access-token",
  OPENAI_API_KEY: "sk-test",
  LINE_USER_ID_MASTER: "Umaster",
  LINE_USER_ID_ASSISTANT2: "Uassistant2",
  LINE_GROUP_ID_FAMILY: "Cfamily",
} as const satisfies Record<string, string>;
