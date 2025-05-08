import { Config } from "@mastra/core";

type MiddlewareOption = NonNullable<
  NonNullable<Config["server"]>["middleware"]
>;
type Middleware = Extract<MiddlewareOption, { path: string }>;

export const auth: Middleware = {
  path: "/api/*",
  handler: async (c, next): Promise<Response | void> => {
    const authorizationHeader = c.req.header("Authorization");
    const [prefix, token] = authorizationHeader?.split(" ") ?? [];

    if (prefix === "Bearer" && token && token === process.env["TOKEN"]) {
      await next();
      return;
    }

    return c.json({ message: "Unauthorized" }, { status: 401 });
  },
};
