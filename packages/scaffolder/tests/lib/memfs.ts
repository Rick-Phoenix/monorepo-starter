import { throwErr } from "@monorepo-starter/utils";
import { fs as memfsInstance, vol } from "memfs";
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it, test, vi } from "vitest";
import YAML from "yaml";

const fs_disk = await vi.importActual<typeof import("node:fs")>(
  "node:fs",
);

export function copyDirectoryToMemfs(
  sourceDirOnDisk: string,
  targetDirInMemfs: string,
): void {
  if (!fs_disk.existsSync(sourceDirOnDisk)) {
    throwErr(`Source directory NOT FOUND on disk: ${sourceDirOnDisk}`);
  }
  if (!fs_disk.statSync(sourceDirOnDisk).isDirectory()) {
    throwErr(`Source directory is not a directory: ${sourceDirOnDisk}`);
  }

  memfsInstance.mkdirSync(targetDirInMemfs, { recursive: true });

  const entries = fs_disk.readdirSync(sourceDirOnDisk, { withFileTypes: true });

  for (const entry of entries) {
    const currentSourcePath = join(sourceDirOnDisk, entry.name);
    const currentTargetPathInMemfs = join(
      targetDirInMemfs,
      entry.name,
    );

    if (entry.isDirectory()) {
      copyDirectoryToMemfs(currentSourcePath, currentTargetPathInMemfs);
    } else if (entry.isFile()) {
      const fileContent = fs_disk.readFileSync(currentSourcePath);
      memfsInstance.writeFileSync(
        currentTargetPathInMemfs,
        fileContent,
      );
    }
  }
}

interface JsonCheckOpts {
  action: Action;
  globalOutFile?: string;
  checks: {
    outputFile?: string;
    fieldToCheck: string;
    expectedValue: unknown;
    flags?: string[];
  }[];
}

export function checkJsonOutput(opts: JsonCheckOpts) {
  test.for(opts.checks)(
    "outputs the correct json for $fieldToCheck",
    async (check) => {
      await opts.action(check.flags);
      const outputPath = check.outputFile || opts.globalOutFile;
      if (!outputPath) throw new Error("No output file has been specified.");
      const outputFile = vol.toJSON(outputPath)[outputPath]!;
      const outputData = JSON.parse(outputFile) as Record<string, unknown>;
      const nestedFields = check.fieldToCheck.split(".");
      let targetField: unknown = outputData;
      for (const field of nestedFields) {
        if (typeof targetField !== "object" || targetField === null) {
          targetField = undefined;
          break;
        }
        // @ts-expect-error Cannot know the exact type structure in advance
        targetField = targetField[field];

        if (targetField === undefined) break;
      }
      if (check.expectedValue === "object") {
        expect(targetField).toBeInstanceOf(Object);
      } else {
        expect(targetField).toStrictEqual(check.expectedValue);
      }
    },
  );
}

interface YamlCheckOpts {
  action: Action;
  globalOutFile?: string;
  checks: {
    outputFile?: string;
    fieldToCheck: string;
    expectedValue: unknown;
    flags?: string[];
  }[];
}

export function checkYamlOutput(opts: YamlCheckOpts) {
  test.for(opts.checks)(
    "outputs the correct yaml for $fieldToCheck",
    async (check) => {
      await opts.action(check.flags);
      const outputPath = check.outputFile || opts.globalOutFile;
      if (!outputPath) throw new Error("No output file has been specified.");
      const outputFile = vol.toJSON(outputPath)[outputPath]!;
      const outputData = YAML.parse(outputFile) as Record<string, unknown>;
      const nestedFields = check.fieldToCheck.split(".");
      let targetField: unknown = outputData;
      for (const field of nestedFields) {
        if (typeof targetField !== "object" || targetField === null) {
          targetField = undefined;
          break;
        }
        // @ts-expect-error Cannot know the exact type structure in advance
        targetField = targetField[field];

        if (targetField === undefined) break;
      }
      if (check.expectedValue === "object") {
        expect(targetField).toBeInstanceOf(Object);
      } else {
        expect(targetField).toStrictEqual(check.expectedValue);
      }
    },
  );
}

type Action = (flags: undefined | string[]) => Promise<unknown>;
type ActionWithArgs = (flags: string[]) => Promise<unknown>;

interface CheckDirResolutionOpts {
  action: ActionWithArgs;
  checks: { outputPath: string; dirFlag?: string; flags?: string[] }[];
}

export async function checkDirResolution(opts: CheckDirResolutionOpts) {
  for (const check of opts.checks) {
    test.for([".", "somedir/someotherdir", "/absolutepath"])(
      "follows the cwd change correctly",
      async (dir) => {
        await opts.action([check.dirFlag || "-d", dir, ...(check.flags || [])]);
        const out = resolve(dir, check.outputPath);
        expect(existsSync(out)).toBe(true);
      },
    );
  }
}

interface CheckSingleJsonOutput {
  flags: (undefined | string[])[];
  outputFile: string;
  fieldToCheck: string;
  expectedValue: unknown;
  action: Action;
}

export function checkSingleJsonOutput(opts: CheckSingleJsonOutput) {
  for (const flagGroup of opts.flags) {
    checkJsonOutput({
      action: opts.action,
      checks: [
        {
          flags: flagGroup,
          outputFile: opts.outputFile,
          expectedValue: opts.expectedValue,
          fieldToCheck: opts.fieldToCheck,
        },
      ],
    });
  }
}

interface CheckFileCreationOpts {
  action: Action;
  checks: {
    outputFiles: string | string[];
    flags?: string[];
    logOutput?: boolean;
  }[];
}

export async function checkFileCreation(opts: CheckFileCreationOpts) {
  for (const check of opts.checks) {
    if (typeof check.outputFiles === "string") {
      check.outputFiles = [check.outputFiles];
    }

    test.for(check.outputFiles)(
      "creates the file '%s' successfully",
      async (out) => {
        await opts.action(check.flags);
        if (check.logOutput) {
          const output = vol.toJSON(out);
          console.log(`🔍🔍 output for '${out}': 🔍🔍`, output);
        }
        expect(existsSync(out)).toBe(true);
      },
    );
  }
}

interface CheckTextContentOpts {
  action: Action;
  checks: {
    flags?: string[];
    match: string;
    outFile?: string;
    noMatch?: boolean;
    logOutput?: boolean;
  }[];
  globalOutFile?: string;
}

export async function checkTextContent(opts: CheckTextContentOpts) {
  test.for(opts.checks)(
    "matches the desired outcome",
    async (check) => {
      if (!opts.globalOutFile && !check.outFile) {
        throwErr(
          `Missing an out file to check for ${check.match}`,
        );
      }
      await opts.action(check.flags);

      const outPath = check.outFile || opts.globalOutFile as string;
      const output = vol.toJSON(outPath)[outPath];

      if (check.logOutput) {
        console.log(
          `🔍🔍 output for ${check.flags?.join() || check.match} 🔍🔍:`,
          output,
        );
      }

      if (check.noMatch) {
        expect(output).not.toMatch(check.match);
      } else {
        expect(output).toMatch(check.match);
      }
    },
  );
}

interface CheckThrowOpts {
  action: Action;
  flags: (undefined | string[])[];
}

export async function checkErrorThrown(opts: CheckThrowOpts) {
  test.for(opts.flags)("throws an error", async (flagGroup) => {
    await expect(async () => opts.action(flagGroup)).rejects.toThrowError();
  });
}

interface CheckDirsCreationOpts {
  action: Action;
  flags?: string[];
  dirs: string | string[];
}

export async function checkDirsCreation(opts: CheckDirsCreationOpts) {
  const dirs = typeof opts.dirs === "string" ? [opts.dirs] : opts.dirs;
  it(`successfully creates the following directories: ${dirs.join(", ")}`, async () => {
    await opts.action(opts.flags);
    dirs.forEach((dir) => {
      const check = statSync(dir).isDirectory();
      expect(check).toBe(true);
    });
  });
}
