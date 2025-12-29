import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { weatherTool } from "../tools/weatherTool";

import systemPrompt from "./fairySystemPrompt.md";

export const fairy = new Agent({
  id: "fairy",
  name: "Fairy",
  instructions: systemPrompt,
  model: openai("gpt-4o"),
  tools: { weatherTool },
  memory: new Memory({
    options: {
      lastMessages: 10,
      semanticRecall: false,
      generateTitle: false,
    },
  }),
});
