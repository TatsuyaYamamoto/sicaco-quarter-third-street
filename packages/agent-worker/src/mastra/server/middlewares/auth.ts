import { DEV, TOKEN } from "../../env";
import { Middleware } from "../../types";

/**
 * Check authorization header, when `/api/*` is called
 */
export const authMiddleware: Middleware = {
  path: "/api/*",
  handler: async (c, next): Promise<Response | void> => {
    if (DEV) {
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
