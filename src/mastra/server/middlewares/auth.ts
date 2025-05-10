import { Config } from "@mastra/core";

import { TOKEN, isDev } from "../../env";

type MiddlewareOption = NonNullable<
  NonNullable<Config["server"]>["middleware"]
>;
type Middleware = Extract<MiddlewareOption, { path: string }>;

/**
 * Check authorization header, when `/api/*` is called
 */
export const authMiddleware: Middleware = {
  path: "/api/*",
  handler: async (c, next): Promise<Response | void> => {
    if (isDev) {
      await next();
      return;
    }

    const authorizationHeader = c.req.header("Authorization");
    const [prefix, token] = authorizationHeader?.split(" ") ?? [];

    if (prefix === "Bearer" && token && token === TOKEN) {
      await next();
      return;
    }

    return c.json({ message: "Unauthorized" }, { status: 401 });
  },
};
