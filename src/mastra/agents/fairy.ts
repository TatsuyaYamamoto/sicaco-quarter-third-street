import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { weatherTool } from "../tools/weatherTool";

import systemPrompt from "./fairySystemPrompt.md";

export const fairy = new Agent({
  name: "Fairy",
  instructions: systemPrompt,
  model: openai("gpt-4o"),
  tools: { weatherTool },
  // @ts-expect-error --- `create-mastra`'s code is already not type-safe. Perhaps, `@mastra/core` and `@mastra/memory` is not compatible.
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
