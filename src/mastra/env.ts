import { z } from "zod";

const envVariables = z.object({
  DEV: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  TOKEN: z.string(),
  LINE_CHANNEL_SECRET: z.string(),
  LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN: z.string(),
});

export const {
  DEV,
  TOKEN,
  LINE_CHANNEL_SECRET,
  LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN,
} = envVariables.parse(process.env);
