// NOTE: Mastra's bundle command replace `process.env.NODE_ENV` with `"production"`,
// so it cannot preserve `process.env.NODE_ENV` when running on Workers.
// https://github.com/mastra-ai/mastra/blob/mastra%400.10.6/packages/deployer/src/build/bundler.ts#L17
const APP_ENV = process.env["APP_ENV"];

export const DEV = APP_ENV === "development";

export const TOKEN = process.env["TOKEN"];

export const LINE_CHANNEL_SECRET = process.env["LINE_CHANNEL_SECRET"] as string;

export const LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN = process.env[
  "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN"
] as string;

// it's safe to be public
// https://github.com/cloudflare/cloudflare-docs/issues/474
export const CLOUDFLARE_ACCOUNT_ID = "5b6598ad8b63248ec5d31e5040050e8b";

export const CLOUDFLARE_API_TOKEN = process.env[
  "CLOUDFLARE_API_TOKEN"
] as string;

export const CLOUDFLARE_D1_DATABASE_ID = "8042c429-bfb4-4d97-b0c6-5de7b178f118";
