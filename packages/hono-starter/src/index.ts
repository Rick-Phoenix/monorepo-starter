import { registerOpenApiRoutes, textResponse } from "$lib/openapi.js";
import { type } from "arktype";
import { describeRoute } from "hono-openapi";
import { createApp } from "./lib/setup.js";
import { paramsValidator } from "./lib/validators.js";

export const validationSchema = type({
  app: '"hono"',
});

const app = createApp().get(
  "/app/:app",
  describeRoute({
    description: "Say hello to the user",
    responses: {
      200: {
        description: "Successful greeting response",
        content: textResponse(),
      },
    },
  }),
  paramsValidator(validationSchema),
  (c) => {
    const { app } = c.req.valid("param");
    return c.text(`Hello from ${app}!`);
  },
);

registerOpenApiRoutes(app);

export default app;
