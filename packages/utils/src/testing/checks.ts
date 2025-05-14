import { createFsFromVolume, type Volume } from "memfs";
import { resolve } from "node:path";
import YAML from "yaml";
import { maybeArrayIncludes } from "../array.js";
import { getValue } from "../objects.js";
import type { ExcludeAll } from "../types/utils.js";

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

type YamlOrJsonCheck = Omit<OutputCheck, "value" | "kind"> & {
  property: string;
  kind?: CheckKind;
};

export type YamlOrJsonCheckOpts =
  & {
    log?: boolean;
    outputFile: string;
  }
  & (
    | { checks: YamlOrJsonCheck[] }
      & ExcludeAll<YamlOrJsonCheck>
    | (YamlOrJsonCheck & { checks?: never })
  );

export function createFsTestSuite(
  opts: {
    vol: Volume;
    expect: typeof import("vitest").expect;
  },
) {
  const vol = opts.vol;
  const expect = opts.expect;
  const { existsSync, statSync } = createFsFromVolume(vol);
  return {
    checkOutput(check: OutputCheck) {
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
    },
    checkJsonOutput(opts: YamlOrJsonCheckOpts) {
      const checkOutput = this.checkOutput;
      const outputPath = resolve(opts.outputFile);
      const outputFile = vol.toJSON(outputPath)[outputPath]!;
      const outputData = JSON.parse(outputFile) as Record<string, unknown>;
      if (opts.log) {
        // eslint-disable-next-line no-console
        console.log(`🔍🔍 output for '${outputPath}':🔍🔍`, outputData);
      }
      if (opts.checks) {
        for (const check of opts.checks) {
          const value = getValue(outputData, check.property);
          const { kind, expected, negateResult } = check;
          //@ts-expect-error Cannot know the type in advance
          checkOutput({
            kind: kind || "strictEqual",
            expected,
            negateResult,
            value,
          });
        }
      } else {
        const value = getValue(outputData, opts.property);
        const { kind, expected, negateResult } = opts;
        //@ts-expect-error Cannot know the type in advance
        checkOutput({
          kind: kind || "strictEqual",
          expected,
          negateResult,
          value,
        });
      }
    },
    checkYamlOutput(opts: YamlOrJsonCheckOpts) {
      const checkOutput = this.checkOutput;
      const outputPath = resolve(opts.outputFile);
      const outputFile = vol.toJSON(outputPath)[outputPath]!;
      const outputData = YAML.parse(outputFile) as Record<string, unknown>;
      if (opts.log) {
        // eslint-disable-next-line no-console
        console.log(`🔍🔍 output for '${outputPath}':🔍🔍`, outputData);
      }
      if (opts.checks) {
        for (const check of opts.checks) {
          const value = getValue(outputData, check.property);
          const { kind, expected, negateResult } = check;
          //@ts-expect-error Cannot know the type in advance
          checkOutput({
            kind: kind || "strictEqual",
            expected,
            negateResult,
            value,
          });
        }
      } else {
        const value = getValue(outputData, opts.property);
        const { kind, expected, negateResult } = opts;
        //@ts-expect-error Cannot know the type in advance
        checkOutput({
          kind: kind || "strictEqual",
          expected,
          negateResult,
          value,
        });
      }
    },
    checkFilesCreation(opts: CheckFileCreationOpts) {
      const files = Array.isArray(opts.files) ? opts.files : [opts.files];
      for (const outputFile of files) {
        const outputPath = resolve(outputFile);
        if (
          opts.log === true ||
          (maybeArrayIncludes(opts.log, outputFile))
        ) {
          const output = vol.toJSON(outputPath)[outputPath];
          // eslint-disable-next-line no-console
          console.log(`🔍🔍 output for '${outputPath}': 🔍🔍`, output);
        }
        expect(existsSync(outputPath)).toBe(true);
      }
    },
    checkTextContent(opts: CheckTextContentOpts) {
      const checkOutput = this.checkOutput;
      const outPath = resolve(opts.outputFile);
      const output = vol.toJSON(outPath)[outPath]!;

      const singleCheck = (check: TextCheck) => {
        if (check.log) {
          // eslint-disable-next-line no-console
          console.log(
            `🔍🔍 output for '${outPath}' 🔍🔍:`,
            output,
          );
        }

        const { negateResult, match } = check;

        checkOutput({
          negateResult,
          expected: match,
          kind: "match",
          value: output,
        });
      };

      if (opts.checks) {
        opts.checks.forEach((c) =>
          singleCheck({
            log: c.log,
            negateResult: c.negateResult,
            match: c.match,
          })
        );
      } else {
        singleCheck({
          log: opts.log,
          negateResult: opts.negateResult,
          match: opts.match,
        });
      }
    },
    checkDirsCreation(opts: CheckDirsCreationOpts) {
      const dirs = typeof opts.dirs === "string" ? [opts.dirs] : opts.dirs;
      dirs.forEach((dir) => {
        const dirPath = resolve(dir);
        const check = statSync(dirPath).isDirectory();
        expect(check).toBe(true);
      });
    },
  };
}

export interface CheckFileCreationOpts {
  files: string[] | string;
  log?: boolean | string[];
}

export interface TextCheck {
  match: string | RegExp;
  negateResult?: boolean;
  log?: boolean;
}

type CheckTextContentOpts =
  & {
    outputFile: string;
  }
  & (
    | TextCheck & { checks?: never }
    | { checks: TextCheck[] } & ExcludeAll<TextCheck>
  );

export interface CheckDirsCreationOpts {
  dirs: string | string[];
}
