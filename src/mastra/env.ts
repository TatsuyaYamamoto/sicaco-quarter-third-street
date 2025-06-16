import { z } from "zod";

const envVariables = z.object({
  DEV: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  TOKEN: z.string(),
  LINE_CHANNEL_SECRET: z.string(),
  LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN: z.string(),
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_API_TOKEN: z.string(),
});

export const {
  DEV,
  TOKEN,
  LINE_CHANNEL_SECRET,
  LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN,
} = envVariables.parse(process.env);
