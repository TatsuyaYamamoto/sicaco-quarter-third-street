import { Mastra, createLogger } from "@mastra/core";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";
// import { LibSQLStore } from "@mastra/libsql";

import { fairy } from "./agents/fairy";
import { weatherAgent } from "./agents/weatherAgent";
import { auth } from "./server/middlewares/auth";
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
    middleware: [auth],
  },
  deployer: new CloudflareDeployer({
    scope: "***",
    projectName: "sicaco-3rd",
    auth: {
      apiToken: "***",
    },
  }),
});
