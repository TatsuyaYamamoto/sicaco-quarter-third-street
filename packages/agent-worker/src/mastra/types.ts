import type { Config } from "@mastra/core";

type MiddlewareOption = NonNullable<
  NonNullable<Config["server"]>["middleware"]
>;

export type Middleware = Extract<MiddlewareOption, { path: string }>;

export type MiddlewareHandler = Middleware["handler"];
