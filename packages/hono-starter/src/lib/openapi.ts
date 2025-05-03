import { Scalar } from "@scalar/hono-api-reference";
import { type Type, type } from "arktype";
import type { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import { resolver } from "hono-openapi/arktype";

export const registerOpenApiRoutes = (app: Hono) => {
  app.get(
    "/openapi",
    openAPISpecs(app, {
      documentation: {
        info: {
          title: "Hono",
          version: "1.0.0",
          description: "A hono api",
        },
        servers: [
          {
            url: "http://localhost:3000",
            description: "Local server",
          },
        ],
      },
    }),
  );

  app.get(
    "/docs",
    Scalar({
      theme: "saturn",
      url: "/openapi",
    }),
  );
};

export const jsonResponse = (schema: Type) => {
  return {
    "application/json": {
      schema: resolver(schema),
    },
  };
};

export const textResponse = (schema = type("string")) => {
  return {
    "text/plain": {
      schema: resolver(schema),
    },
  };
};
