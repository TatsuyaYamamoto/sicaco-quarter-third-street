import { z } from "zod";

const envVariables = z.object({
  TOKEN: z.string(),
  LINE_CHANNEL_SECRET: z.string(),
  LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN: z.string(),
});

export const {
  TOKEN,
  LINE_CHANNEL_SECRET,
  LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN,
} = envVariables.parse(process.env);

export const isDev = process.env["NODE_ENV"] === "development";
