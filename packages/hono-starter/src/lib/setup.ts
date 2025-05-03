import { type } from "arktype";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { pinoLogger as logger } from "hono-pino";
import { csrf } from "hono/csrf";
import { etag } from "hono/etag";
import { secureHeaders } from "hono/secure-headers";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { pino } from "pino";
import pretty from "pino-pretty";
import { INTERNAL_SERVER_ERROR } from "../constants/http_codes.js";
import { env } from "./env.js";

export function pinoLogger() {
  return logger({
    pino: pino(
      {
        level: env.LOG_LEVEL,
      },
      env.NODE_ENV === "production" ? undefined : pretty(),
    ),
  });
}

export function createApp() {
  const app = new Hono({ strict: false });

  // Logging
  app.use(pinoLogger());

  // Default handlers
  app.use(
    describeRoute({
      responses: {
        "400": {
          description: "Bad Request",
          content: {
            "text/plain": {
              schema: type("string"),
            },
          },
        },
        "401": {
          description: "Access Denied",
          content: {
            "text/plain": {
              schema: type("string"),
            },
          },
        },
        "403": {
          description: "Forbidden",
          content: {
            "text/plain": {
              schema: type("string"),
            },
          },
        },
        "404": {
          description: "Not Found",
          content: {
            "text/plain": {
              schema: type("string"),
            },
          },
        },
      },
    }),
  );

  // Error Handling
  app.notFound((c) => {
    return c.json("Not Found", 404);
  });

  app.onError((err, c) => {
    const statusCode = ("status" in err && typeof err.status === "number")
      ? err.status || INTERNAL_SERVER_ERROR
      : INTERNAL_SERVER_ERROR;
    const environment = env.NODE_ENV;
    return c.json(
      {
        message: err.message,
        stack: environment === "production" ? void 0 : err.stack,
      },
      statusCode as ContentfulStatusCode,
    );
  });

  // Global Middleware
  if (env.NODE_ENV === "production") {
    try {
      app.use(csrf());
      app.use(etag());
      app.use(
        secureHeaders({
          strictTransportSecurity: true,
          referrerPolicy: "strict-origin-when-cross-origin",
          contentSecurityPolicy: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            childSrc: ["'none'"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            frameSrc: ["'self'"],
            imgSrc: [
              "'self'",
            ],
            manifestSrc: ["'self'"],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            //reportTo: "",
            //sandbox: [],
            scriptSrc: ["strict-dynamic"],
            scriptSrcAttr: ["'none'"],
            scriptSrcElem: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            styleSrcAttr: ["'self'", "'unsafe-inline'"],
            styleSrcElem: ["'self'", "'unsafe-inline'"],
            upgradeInsecureRequests: [],
            workerSrc: ["'self'"],
          },
          permissionsPolicy: {
            fullscreen: ["self"],
            bluetooth: ["none"],
            payment: ["none"],
            syncXhr: [],
            camera: false,
            microphone: false,
            geolocation: ["none"],
            usb: ["none"],
            accelerometer: ["none"],
            gyroscope: ["none"],
            magnetometer: ["none"],
          },
        }),
      );
    } catch (error) {
      throw new Error(
        `Error while setting up secure headers:\n ${error as string}`,
      );
    }
  }

  return app;
}
