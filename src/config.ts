import { z } from "zod";

// 設定値は docs/phases/phase-1.md の「設定値」を参照

const nonEmpty = z.string().min(1);
const positiveInt = z.coerce.number().int().positive();

const configSchema = z.object({
  LINE_CHANNEL_SECRET: nonEmpty,
  LINE_CHANNEL_ACCESS_TOKEN: nonEmpty,
  OPENAI_API_KEY: nonEmpty,
  LINE_MASTER_USER_ID: nonEmpty,
  LINE_ASSISTANT2_USER_ID: nonEmpty,
  LINE_FAMILY_GROUP_ID: nonEmpty,
  OPENAI_MODEL: nonEmpty,
  OPENAI_REASONING_EFFORT: z.enum(["none", "minimal", "low", "medium", "high", "xhigh", "max"]),
  OPENAI_TIMEOUT_SECONDS: positiveInt,
  HISTORY_LIMIT: positiveInt,
  MAX_REGENERATIONS: z.coerce.number().int().nonnegative(),
});

export type Config = {
  line: {
    channelSecret: string;
    channelAccessToken: string;
    masterUserId: string;
    assistant2UserId: string;
    familyGroupId: string;
  };
  openai: {
    apiKey: string;
    model: string;
    reasoningEffort: z.infer<typeof configSchema>["OPENAI_REASONING_EFFORT"];
    timeoutMs: number;
  };
  historyLimit: number;
  maxRegenerations: number;
};

/** Worker の env から設定値を読み出す。不足・不正な値があれば例外を投げる */
export const loadConfig = (env: Env): Config => {
  const c = configSchema.parse(env);
  return {
    line: {
      channelSecret: c.LINE_CHANNEL_SECRET,
      channelAccessToken: c.LINE_CHANNEL_ACCESS_TOKEN,
      masterUserId: c.LINE_MASTER_USER_ID,
      assistant2UserId: c.LINE_ASSISTANT2_USER_ID,
      familyGroupId: c.LINE_FAMILY_GROUP_ID,
    },
    openai: {
      apiKey: c.OPENAI_API_KEY,
      model: c.OPENAI_MODEL,
      reasoningEffort: c.OPENAI_REASONING_EFFORT,
      timeoutMs: c.OPENAI_TIMEOUT_SECONDS * 1000,
    },
    historyLimit: c.HISTORY_LIMIT,
    maxRegenerations: c.MAX_REGENERATIONS,
  };
};
