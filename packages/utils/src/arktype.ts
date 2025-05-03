import type { Type } from "arktype";

export function namedType(schema: Type, name: string) {
  return schema.configure({
    message: (ctx) => `${name} ${ctx.problem}`,
  });
}
