import { throwErr } from "@monorepo-starter/utils";
import { fs as memfsInstance, vol } from "memfs";
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it, test, vi } from "vitest";

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

export function checkJsonOutput(outputPath: string) {
  const target = outputPath;
  const outputFile = vol.toJSON(target)[target]!;
  const outputData = JSON.parse(outputFile) as Record<string, string>;
  return outputData;
}

type Action = (flags: undefined | string[]) => Promise<unknown>;
type ActionWithArgs = (flags: string[]) => Promise<unknown>;

interface CheckDirResolutionOpts {
  action: ActionWithArgs;
  filename: string;
}

export async function checkDirResolution(opts: CheckDirResolutionOpts) {
  test.for([".", "somedir/someotherdir", "/absolutepath"])(
    "follows the cwd change correctly",
    async (dir) => {
      await opts.action(["-d", dir]);
      const out = resolve(dir, opts.filename);
      expect(existsSync(out)).toBe(true);
    },
  );
}

interface CheckFlagsOpts {
  flags: (undefined | string[])[];
  outputPath: string;
  fieldToCheck: string;
  expectedValue: unknown;
  action: Action;
}

export async function checkFlags(opts: CheckFlagsOpts) {
  test.for(opts.flags)("respects flags", async (flagGroup) => {
    await opts.action(flagGroup);
    const outputData = checkJsonOutput(opts.outputPath);
    expect(outputData[opts.fieldToCheck]).toStrictEqual(opts.expectedValue);
  });
}

interface CheckFileCreationOpts {
  outputFiles: string | string[];
  action: Action;
  flags?: string[];
  logOutput?: string[];
}

export async function checkFileCreation(opts: CheckFileCreationOpts) {
  if (typeof opts.outputFiles === "string") {
    opts.outputFiles = [opts.outputFiles];
  }

  test.for(opts.outputFiles)(
    "creates the file '%s' successfully",
    async (out) => {
      await opts.action(opts.flags);
      if (opts.logOutput && opts.logOutput.includes(out)) {
        const output = vol.toJSON(out);
        console.log(`🔍🔍 output for '${out}': 🔍🔍`, output);
      }
      expect(existsSync(out)).toBe(true);
    },
  );
}

interface CheckTextContentOpts {
  action: Action;
  instructions: {
    flags?: string[];
    match: string;
    outFile?: string;
    noMatch?: boolean;
    logOutput?: boolean;
  }[];
  globalOutFile?: string;
}

export async function checkTextContent(opts: CheckTextContentOpts) {
  test.for(opts.instructions)(
    "matches the desired outcome",
    async (instruction) => {
      if (!opts.globalOutFile && !instruction.outFile) {
        throwErr(
          `Missing an out file to check for ${instruction.match}`,
        );
      }
      await opts.action(instruction.flags);

      const outPath = instruction.outFile || opts.globalOutFile as string;
      const output = vol.toJSON(outPath)[outPath];

      if (instruction.logOutput) {
        console.log(
          `🔍🔍 output for ${
            instruction.flags?.join() || instruction.match
          } 🔍🔍:`,
          output,
        );
      }

      if (instruction.noMatch) {
        expect(output).not.toMatch(instruction.match);
      } else {
        expect(output).toMatch(instruction.match);
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
