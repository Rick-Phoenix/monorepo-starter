import type { Type } from "arktype";
import { type } from "arktype";

export function namedType(schema: Type, name: string) {
  return schema.configure({
    message: (ctx) => `${name} ${ctx.problem}`,
  });
}

export const stringType = type("string");
