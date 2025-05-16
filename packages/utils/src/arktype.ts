import type { Type } from "arktype";
import { type } from "arktype";

export function namedType(schema: Type, name: string) {
  return schema.configure({
    message: (ctx) => `${name} ${ctx.problem}`,
  });
}

// Necessary to avoid strange tsdown error
// eslint-disable-next-line ts/no-unnecessary-type-assertion
export const stringType = type("string") as Type<string>;
