// @ts-ignore
import { env } from "cloudflare:workers";

import { D1Store } from "@mastra/cloudflare-d1";
import { Mastra } from "@mastra/core";
import { ConsoleLogger } from "@mastra/core/logger";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";

import { fairy } from "./agents/fairy";
import { weatherAgent } from "./agents/weatherAgent";
import { DEV } from "./env";
import apiLineMessagesWebhook from "./server/api/agents.fairy.line.webhook";
import { authMiddleware } from "./server/middlewares/auth";
import { weatherWorkflow } from "./workflows";

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { fairy, weatherAgent },
  storage: new D1Store({
    // @ts-ignore
    binding: env.MastraStorage,
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
    scope: "***",
    projectName: "sicaco-3rd",
    auth: {
      apiToken: "***",
    },
    d1Databases: [
      {
        binding: "MastraStorage",
        database_name: "sicaco-3rd",
        database_id: "8042c429-bfb4-4d97-b0c6-5de7b178f118",
      },
    ],
  }),
});
