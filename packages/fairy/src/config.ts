/**
 * @file 設定値の読み出しと検証。各設定値の説明は docs/phases/phase-1.md の「設定値」を参照
 */

import { z } from "zod";

const nonEmpty = z.string().min(1);
const positiveInt = z.coerce.number().int().positive();

/** wrangler secret put（ローカルでは .dev.vars）で登録する値 */
const secretsSchema = z.object({
  LINE_CHANNEL_SECRET: nonEmpty,
  LINE_CHANNEL_ACCESS_TOKEN: nonEmpty,
  OPENAI_API_KEY: nonEmpty,
  /** カンマ区切りの文字列を、ID の配列にする */
  LINE_ALLOWED_CONVERSATION_IDS: nonEmpty.transform((value) =>
    value
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== ""),
  ),
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
