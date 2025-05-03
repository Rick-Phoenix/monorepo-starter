import type { ArkError, Type } from "arktype";
import { validator } from "hono-openapi/arktype";
import { UNPROCESSABLE_ENTITY } from "../constants/http_codes.js";

const sensitiveCookies = [
  "session_id",
  "auth_token",
  "access_token",
  "jwt",
  "bearer",
  "csrftoken",
  "csrf_token",
];

const sensitiveHeaders = ["cookie"];

export function headerValidator<T extends Type>(
  schema: T,
  censoredHeaders: string[] = [],
) {
  const protectedHeaders = [...censoredHeaders, ...sensitiveHeaders];
  return validator("header", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          errors: result.errors.map((error: ArkError) => {
            for (const header of protectedHeaders) {
              if (error.data) {
                if (
                  typeof error.data === "object" &&
                  Object.keys(error.data).length &&
                  (error.data as { [key: string]: any })[header]
                ) {
                  (error.data as { [key: string]: any })[header] = "[REDACTED]";
                } else if (error.path.includes(header)) {
                  error.data = "[REDACTED]";
                }
              }
            }
            return error;
          }),
        },
        UNPROCESSABLE_ENTITY,
      );
    }
  });
}

export function cookieValidator<T extends Type>(
  schema: T,
  censoredCookies: string[] = [],
) {
  const protectedCookies = [...censoredCookies, ...sensitiveCookies];
  return validator("cookie", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          errors: result.errors.map((error: ArkError) => {
            for (const cookie of protectedCookies) {
              if (error.data) {
                if (
                  typeof error.data === "object" &&
                  Object.keys(error.data).length &&
                  (error.data as { [key: string]: any })[cookie]
                ) {
                  (error.data as { [key: string]: any })[cookie] = "[REDACTED]";
                } else if (error.path.includes(cookie)) {
                  error.data = "[REDACTED]";
                }
              }
            }
            return error;
          }),
        },
        UNPROCESSABLE_ENTITY,
      );
    }
  });
}

export function jsonValidator<T extends Type>(
  schema: T,
  protectedFields: string[] = [],
) {
  return validator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          errors: protectedFields.length
            ? result.errors.map((error: ArkError) => {
              for (const field of protectedFields) {
                if (error.data) {
                  if (
                    typeof error.data === "object" &&
                    Object.keys(error.data).length &&
                    (error.data as { [key: string]: any })[field]
                  ) {
                    (error.data as { [key: string]: any })[field] =
                      "[REDACTED]";
                  } else if (error.path.includes(field)) {
                    error.data = "[REDACTED]";
                  }
                }
              }
              return error;
            })
            : result.errors,
        },
        UNPROCESSABLE_ENTITY,
      );
    }
  });
}

export function queryValidator<T extends Type>(
  schema: T,
) {
  return validator("query", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          errors: result.errors,
        },
        UNPROCESSABLE_ENTITY,
      );
    }
  });
}

export function paramsValidator<T extends Type>(
  schema: T,
) {
  return validator("param", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          errors: result.errors,
        },
        UNPROCESSABLE_ENTITY,
      );
    }
  });
}

export function formValidator<T extends Type>(
  schema: T,
  protectedFields: string[] = [],
) {
  return validator("form", schema, (result, c) => {
    console.log(c.req.header("Content-Type"));
    if (!result.success) {
      return c.json(
        {
          success: false,
          errors: protectedFields.length
            ? result.errors.map((error: ArkError) => {
              for (const field of protectedFields) {
                if (error.data) {
                  if (
                    typeof error.data === "object" &&
                    Object.keys(error.data).length &&
                    (error.data as { [key: string]: any })[field]
                  ) {
                    (error.data as { [key: string]: any })[field] =
                      "[REDACTED]";
                  } else if (error.path.includes(field)) {
                    error.data = "[REDACTED]";
                  }
                }
              }
              return error;
            })
            : result.errors,
        },
        UNPROCESSABLE_ENTITY,
      );
    }
  });
}
