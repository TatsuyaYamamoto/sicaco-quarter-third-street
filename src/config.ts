import { z } from "zod";

// 設定値は docs/phases/phase-1.md の「設定値」を参照

const nonEmpty = z.string().min(1);
const positiveInt = z.coerce.number().int().positive();

/** wrangler secret put（ローカルでは .dev.vars）で登録する値 */
const secretsSchema = z.object({
  LINE_CHANNEL_SECRET: nonEmpty,
  LINE_CHANNEL_ACCESS_TOKEN: nonEmpty,
  OPENAI_API_KEY: nonEmpty,
  LINE_MASTER_USER_ID: nonEmpty,
  LINE_ASSISTANT2_USER_ID: nonEmpty,
  LINE_FAMILY_GROUP_ID: nonEmpty,
});

/** wrangler.jsonc の vars に書く値 */
const varsSchema = z.object({
  OPENAI_MODEL: nonEmpty,
  OPENAI_REASONING_EFFORT: z.enum(["none", "minimal", "low", "medium", "high", "xhigh", "max"]),
  OPENAI_TIMEOUT_SECONDS: positiveInt,
  HISTORY_LIMIT: positiveInt,
  MAX_REGENERATIONS: z.coerce.number().int().nonnegative(),
});

const configSchema = z.object({ ...secretsSchema.shape, ...varsSchema.shape });

export type Config = z.output<typeof configSchema>;

/** Worker の env から設定値を読み出す。不足・不正な値があれば例外を投げる */
export const loadConfig = (env: Env): Config => configSchema.parse(env);
