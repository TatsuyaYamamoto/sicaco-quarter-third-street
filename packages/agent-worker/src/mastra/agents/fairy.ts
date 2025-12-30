import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import { Memory } from "@mastra/memory";

import { SICACO_3RD_SBM_TOKEN, SICACO_3RD_SBM_URL } from "../env";
import { weatherTool } from "../tools/weatherTool";
import systemPrompt from "./fairySystemPrompt.md";

const mcpClient = new MCPClient({
  servers: {
    ["sicaco-3rd-sbm"]: {
      url: new URL(SICACO_3RD_SBM_URL),
      requestInit: {
        headers: {
          Authorization: `Bearer ${SICACO_3RD_SBM_TOKEN}`,
        },
      },
      // fetch: async (url, init) => {
      //   const json = JSON.parse(init.body);
      //   console.log(json);
      //   return fetch(url, { ...init });
      // },
    },
  },
});

export const fairy = new Agent({
  id: "fairy",
  name: "Fairy",
  instructions: systemPrompt,
  model: openai("gpt-4o"),
  tools: {
    weatherTool,
    ...(await mcpClient.listTools()),
  },
  memory: new Memory({
    options: {
      lastMessages: 10,
      semanticRecall: false,
      generateTitle: false,
    },
  }),
});
