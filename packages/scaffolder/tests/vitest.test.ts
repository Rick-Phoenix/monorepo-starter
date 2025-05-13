import { join, resolve } from "node:path";
import { describe } from "vitest";
import { genVitestConfig } from "../src/cli/gen_vitest_config.js";
import {
  checkDirResolution,
  checkDirsCreation,
  checkTextContent,
} from "./lib/memfs.js";

const output = join(process.cwd(), "vitest.config.ts");
const action = genVitestConfig;

describe("testing the gen-vitest cli", async () => {
  await checkDirResolution({
    checks: [
      {
        outputPath: "vitest.config.ts",
      },
    ],
    action,
  });

  await checkDirsCreation({
    action,
    flags: ["--tests-dir"],
    dirs: resolve(process.cwd(), "tests"),
  });

  await checkTextContent({
    globalOutFile: output,
    checks: [
      {
        match:
          'setupFiles: [ resolve(import.meta.dirname, "tests/tests.setup.ts") ]',
        flags: ["--full", "--tests-dir"],
      },
    ],
    action,
  });
});
