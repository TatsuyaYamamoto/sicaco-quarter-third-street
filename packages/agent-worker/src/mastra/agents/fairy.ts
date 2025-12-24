import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { weatherTool } from "../tools/weatherTool";

import systemPrompt from "./fairySystemPrompt.md";

export const fairy = new Agent({
  name: "Fairy",
  instructions: systemPrompt,
  model: openai("gpt-5-mini"),
  tools: { weatherTool },
  memory: new Memory({
    options: {
      lastMessages: 10,
      semanticRecall: false,
      threads: {
        generateTitle: false,
      },
    },
  }),
});
