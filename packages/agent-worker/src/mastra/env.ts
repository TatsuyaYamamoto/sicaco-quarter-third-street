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

export const SICACO_3RD_SBM_URL = process.env["SICACO_3RD_SBM_URL"] as string;
export const SICACO_3RD_SBM_TOKEN = process.env[
  "SICACO_3RD_SBM_TOKEN"
] as string;

// it's safe to be public
// https://github.com/cloudflare/cloudflare-docs/issues/474
export const CLOUDFLARE_ACCOUNT_ID = "f7860848cdb73de501d77e3002a8fb9c";

export const CLOUDFLARE_API_TOKEN = process.env[
  "CLOUDFLARE_API_TOKEN"
] as string;

export const CLOUDFLARE_D1_DATABASE_ID = "9264f711-1f9b-4b99-bb21-c9cc7383acfb";
