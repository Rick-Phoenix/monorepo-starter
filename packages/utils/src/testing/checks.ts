import { expect } from "vitest";

type Primitive =
  | "bigint"
  | "boolean"
  | "function"
  | "number"
  | "object"
  | "string"
  | "symbol"
  | "undefined";

export type CheckKind =
  | "strictEqual"
  | "match"
  | "typeof"
  | "instanceOf"
  | "matchObject"
  | "property"
  | "contain"
  | "containEqual"
  | "truthy"
  | "length"
  | "greaterThan"
  | "greaterThanOrEqual";

interface CheckStrictEqual {
  kind?: "strictEqual";
  value: unknown;
  expected: unknown;
  negateResult?: boolean;
}

interface CheckMatch {
  kind: "match";
  value: string;
  expected: string | RegExp;
  negateResult?: boolean;
}

interface CheckTypeOf {
  kind: "typeof";
  value: unknown;
  expected: Primitive;
  negateResult?: boolean;
}

interface CheckMatchObject {
  kind: "matchObject";
  value: unknown;
  expected: object;
  negateResult?: boolean;
}

interface CheckInstanceOf {
  kind: "instanceOf";
  value: unknown;
  expected: unknown;
  negateResult?: boolean;
}

export interface CheckProperty {
  kind: "property";
  value: unknown;
  property: string;
  expected?: unknown;
  negateResult?: boolean;
}

interface CheckContain {
  kind: "contain";
  value: unknown[] | string;
  expected: unknown;
  negateResult?: boolean;
}

interface CheckContainEqual {
  kind: "containEqual";
  value: unknown[];
  expected: unknown[] | object;
  negateResult?: boolean;
}

interface CheckLength {
  kind: "length";
  value: unknown[] | string;
  expected: number;
  negateResult?: boolean;
}

interface CheckTruthy {
  kind: "truthy";
  value: unknown;
  negateResult?: boolean;
  expected?: boolean;
}

interface CheckGreaterThan {
  kind: "greaterThan";
  value: number;
  negateResult?: boolean;
  expected?: boolean;
}

interface CheckGreaterThanOrEqual {
  kind: "greaterThanOrEqual";
  value: number;
  negateResult?: boolean;
  expected?: boolean;
}

export type OutputCheck =
  | CheckStrictEqual
  | CheckMatch
  | CheckTypeOf
  | CheckMatchObject
  | CheckInstanceOf
  | CheckProperty
  | CheckLength
  | CheckTruthy
  | CheckContain
  | CheckContainEqual
  | CheckGreaterThan
  | CheckGreaterThanOrEqual;

export function checkOutput(check: OutputCheck) {
  const { expected, value, negateResult } = check;
  const kind = check.kind || "strictEqual";

  if (kind === "strictEqual") {
    if (negateResult) {
      expect(value).not.toStrictEqual(expected);
    } else {
      expect(value).toStrictEqual(expected);
    }
  } else if (kind === "match") {
    if (negateResult) {
      expect(value).not.toMatch(expected as string);
    } else {
      expect(value).toMatch(expected as string);
    }
  } else if (kind === "typeof") {
    if (negateResult) {
      expect(value).not.toBeTypeOf(expected as Primitive);
    } else {
      expect(value).toBeTypeOf(expected as Primitive);
    }
  } else if (kind === "matchObject") {
    if (negateResult) {
      expect(value).not.toMatchObject(expected as object);
    } else {
      expect(value).toMatchObject(expected as object);
    }
  } else if (kind === "instanceOf") {
    if (negateResult) {
      expect(value).not.toBeInstanceOf(expected);
    } else {
      expect(value).toBeInstanceOf(expected);
    }
  } else if (kind === "property") {
    const { property } = check as CheckProperty;
    if (negateResult) {
      expect(value).not.toHaveProperty(property, expected);
    } else {
      expect(value).toHaveProperty(property, expected);
    }
  } else if (kind === "contain") {
    if (negateResult) {
      expect(value).not.toContain(expected);
    } else {
      expect(value).toContain(expected);
    }
  } else if (kind === "containEqual") {
    if (negateResult) {
      expect(value).not.toContainEqual(expected);
    } else {
      expect(value).toContainEqual(expected);
    }
  } else if (kind === "truthy") {
    if (negateResult) {
      expect(value).not.toBeTruthy();
    } else {
      expect(value).toBeTruthy();
    }
  } else if (kind === "length") {
    if (negateResult) {
      expect(value).not.toHaveLength(expected as number);
    } else {
      expect(value).toHaveLength(expected as number);
    }
  } else if (kind === "greaterThan") {
    if (negateResult) {
      expect(value).not.toBeGreaterThan(expected as number);
    } else {
      expect(value).toBeGreaterThan(expected as number);
    }
  } else if (kind === "greaterThanOrEqual") {
    if (negateResult) {
      expect(value).not.toBeGreaterThanOrEqual(expected as number);
    } else {
      expect(value).toBeGreaterThanOrEqual(expected as number);
    }
  }
}
