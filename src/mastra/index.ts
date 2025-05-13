import { Mastra, createLogger } from "@mastra/core";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";
// import { LibSQLStore } from "@mastra/libsql";

import { fairy } from "./agents/fairy";
import { weatherAgent } from "./agents/weatherAgent";
import apiLineMessagesWebhook from "./server/api/agents.fairy.line.webhook";
import { authMiddleware } from "./server/middlewares/auth";
import { weatherWorkflow } from "./workflows";

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { fairy, weatherAgent },
  // storage: new LibSQLStore({
  //   // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
  //   url: ":memory:",
  // }),
  logger: createLogger({
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
  }),
});
