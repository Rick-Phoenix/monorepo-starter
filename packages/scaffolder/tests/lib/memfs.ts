import {
  copyDirectoryToMemfs,
  createFsTestSuite,
} from "@monorepo-starter/utils";
import { vol } from "memfs";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it, vi } from "vitest";

const fs_disk = await vi.importActual<typeof import("node:fs")>(
  "node:fs",
);

export function resetVol() {
  const templatesDir = join(import.meta.dirname, "../../templates");
  const srcTemplatesDir = join(
    import.meta.dirname,
    "../../src/templates",
  );

  vol.reset();
  copyDirectoryToMemfs(
    {
      sourceDirOnDisk: templatesDir,
      targetDirInMemfs: srcTemplatesDir,
      fs: fs_disk,
      vol,
    },
  );
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
