import { D1Store } from "@mastra/cloudflare-d1";
import { Mastra } from "@mastra/core";
import { ConsoleLogger } from "@mastra/core/logger";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";

import { fairy } from "./agents/fairy";
import { weatherAgent } from "./agents/weatherAgent";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_D1_DATABASE_ID,
  DEV,
} from "./env";
import apiLineMessagesWebhook from "./server/api/agents.fairy.line.webhook";
import { authMiddleware } from "./server/middlewares/auth";
import { weatherWorkflow } from "./workflows";

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { fairy, weatherAgent },
  storage: new D1Store({
    id: "d1-store",
    // @ts-expect-error --- it's ok because `import { env } from "cloudflare:workers";` is inserted into the bundle file at build time.
    ...(typeof env !== "undefined"
      ? // for workers, binding is available
        {
          // @ts-expect-error --- it's ok because `import { env } from "cloudflare:workers";` is inserted into the bundle file at build time.
          binding: env.MastraStorage,
        }
      : // for local development
        {
          accountId: CLOUDFLARE_ACCOUNT_ID,
          apiToken: CLOUDFLARE_API_TOKEN,
          databaseId: CLOUDFLARE_D1_DATABASE_ID,
        }),
    tablePrefix: DEV ? "dev_" : "",
  }),
  logger: new ConsoleLogger({
    name: "Mastra",
    level: "info",
  }),
  server: {
    apiRoutes: [apiLineMessagesWebhook],
    middleware: [authMiddleware],
  },
  deployer: new CloudflareDeployer({
    projectName: "sicaco-3rd--agent-worker",
    d1Databases: [
      {
        binding: "MastraStorage",
        database_name: "sicaco-3rd",
        database_id: CLOUDFLARE_D1_DATABASE_ID,
      },
    ],
  }),
});
