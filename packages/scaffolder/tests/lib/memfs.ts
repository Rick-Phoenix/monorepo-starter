import {
  checkOutput,
  type CheckProperty,
  type ExcludeAll,
  maybeArrayIncludes,
  throwErr,
} from "@monorepo-starter/utils";
import { fs as memfsInstance, vol } from "memfs";
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test, vi } from "vitest";
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

type YamlOrJsonCheck = Omit<CheckProperty, "value" | "kind">;

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

export function checkJsonOutput(opts: YamlOrJsonCheckOpts) {
  const outputPath = resolve(opts.outputFile);
  const outputFile = vol.toJSON(outputPath)[outputPath]!;
  const outputData = JSON.parse(outputFile) as Record<string, unknown>;
  if (opts.log) {
    console.log(`🔍🔍 output for '${outputPath}':🔍🔍`, outputData);
  }
  if (opts.checks) {
    for (const check of opts.checks) {
      checkOutput({ ...check, value: outputData, kind: "property" });
    }
  } else {
    checkOutput({ ...opts, value: outputData, kind: "property" });
  }
}

export function checkYamlOutput(opts: YamlOrJsonCheckOpts) {
  const outputPath = resolve(opts.outputFile);
  const outputFile = vol.toJSON(outputPath)[outputPath]!;
  const outputData = YAML.parse(outputFile) as Record<string, unknown>;
  if (opts.log) {
    console.log(`🔍🔍 output for '${outputPath}':🔍🔍`, outputData);
  }
  if (opts.checks) {
    for (const check of opts.checks) {
      checkOutput({ ...check, value: outputData, kind: "property" });
    }
  } else {
    checkOutput({ ...opts, value: outputData, kind: "property" });
  }
}

type Action = (flags: undefined | string[]) => Promise<unknown>;

interface CheckDirResolutionOpts {
  action: Action;
  outputPath: string;
  dirFlag?: string;
  flags?: string[];
}

export function checkDirResolution(opts: CheckDirResolutionOpts) {
  test.for([".", "somedir/someotherdir", "/absolutepath"])(
    "follows the cwd change correctly",
    async (dir) => {
      await opts.action([opts.dirFlag || "-d", dir, ...(opts.flags || [])]);
      const out = resolve(dir, opts.outputPath);
      expect(existsSync(out)).toBe(true);
    },
  );
}

interface CheckFileCreationOpts {
  files: string[];
  log?: boolean | string[];
}

export function checkFileCreation(opts: CheckFileCreationOpts) {
  for (const outputFile of opts.files) {
    const outputPath = resolve(outputFile);
    if (
      opts.log === true ||
      (maybeArrayIncludes(opts.log, outputFile))
    ) {
      const output = vol.toJSON(outputPath)[outputPath];
      console.log(`🔍🔍 output for '${outputPath}': 🔍🔍`, output);
    }
    expect(existsSync(outputPath)).toBe(true);
  }
}

interface CheckTextContentOpts {
  outFile: string;
  match: string | RegExp;
  negateResult?: boolean;
  log?: boolean;
}

export function checkTextContent(opts: CheckTextContentOpts) {
  const outPath = resolve(opts.outFile);
  const output = vol.toJSON(outPath)[outPath]!;

  if (opts.log) {
    console.log(
      `🔍🔍 output for ${outPath} 🔍🔍:`,
      output,
    );
  }

  const { negateResult, match } = opts;

  checkOutput({
    negateResult,
    expected: match,
    kind: "match",
    value: output,
  });
}

interface CheckDirsCreationOpts {
  dirs: string | string[];
}

export function checkDirsCreation(opts: CheckDirsCreationOpts) {
  const dirs = typeof opts.dirs === "string" ? [opts.dirs] : opts.dirs;
  dirs.forEach((dir) => {
    const dirPath = resolve(dir);
    const check = statSync(dirPath).isDirectory();
    expect(check).toBe(true);
  });
}
