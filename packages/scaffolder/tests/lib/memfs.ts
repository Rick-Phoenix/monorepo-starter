import { createFsTestSuite, throwErr } from "@monorepo-starter/utils";
import { fs as memfsInstance, vol } from "memfs";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it, vi } from "vitest";

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

type Action = (flags: undefined | string[]) => Promise<unknown>;

interface CheckDirResolutionOpts {
  action: Action;
  outputPath: string;
  dirFlag?: string;
  flags?: string[];
}

export function checkDirResolutionCli(opts: CheckDirResolutionOpts) {
  const dirs = [".", "somedir/someotherdir", "/absolutepath"];
  for (const dir of dirs) {
    it(`resolves the dir '${dir}' correctly`, async () => {
      await opts.action([opts.dirFlag || "-d", dir, ...(opts.flags || [])]);
      const out = resolve(dir, opts.outputPath);
      expect(existsSync(out)).toBe(true);
    });
  }
}

const {
  checkDirsCreation,
  checkFilesCreation,
  checkYamlOutput,
  checkJsonOutput,
  checkTextContent,
} = createFsTestSuite({ vol, expect });

export {
  checkDirsCreation,
  checkFilesCreation,
  checkJsonOutput,
  checkTextContent,
  checkYamlOutput,
};
