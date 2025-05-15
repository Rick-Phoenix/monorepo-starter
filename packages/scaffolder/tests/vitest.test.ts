import { vol } from "memfs";
import { basename, join } from "node:path";
import { beforeEach, describe, it } from "vitest";
import { genVitestConfig } from "../src/cli/gen_vitest_config.js";
import {
  checkDirResolutionCli,
  checkFilesCreation,
  checkJsonOutput,
  checkTextContent,
} from "./lib/memfs.js";

const action = genVitestConfig;

describe("testing the gen-vitest cli", () => {
  beforeEach(() => {
    vol.fromJSON({
      [join(process.cwd(), "package.json")]: '{"scripts": {}}',
    });
  });
  it("generates the tests dir and the setup files", async () => {
    const testsDir = "src/__test__";
    const setupFile = "setup/test_setup_file.ts";
    const outputFile = join(testsDir, "vitest.config.ts");
    await action([
      "-d",
      testsDir,
      "--tests-dir",
      testsDir,
      "--setup-file",
      setupFile,
      "--preset",
      "fs",
      "--preset",
      "fast-glob",
      "--script",
    ]);

    checkTextContent({
      outputFile,
      match: `j(setupDir, "${basename(setupFile)}")`,
    });

    checkTextContent({
      outputFile,
      match: `j(setupDir, "fs.ts")`,
    });

    checkJsonOutput({
      outputFile: "package.json",
      property: "scripts.test",
      expected: "vitest --config src/__test__/vitest.config.ts run",
    });

    checkFilesCreation({
      files: [
        outputFile,
        join(testsDir, "setup/fs.ts"),
        join(testsDir, "setup/fast-glob.ts"),
        join(testsDir, setupFile),
      ],
    });
  });

  checkDirResolutionCli({
    outputPath: "vitest.config.ts",
    action,
  });
});
