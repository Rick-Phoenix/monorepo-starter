import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { genVitestConfig } from "../src/cli/gen_vitest_config.js";
import {
  checkDirResolution,
  checkDirsCreation,
  checkFileCreation,
  checkTextContent,
} from "./lib/memfs.js";

const output = join(process.cwd(), "vitest.config.ts");
const action = genVitestConfig;

describe("testing the gen-vitest cli", async () => {
  await checkFileCreation({
    outputFiles: output,
    action,
  });

  it("resets the temporary volume after each test", () => {
    expect(existsSync(output)).toBe(false);
  });

  await checkDirResolution({
    filename: "vitest.config.ts",
    action,
  });

  await checkDirsCreation({
    action,
    flags: ["--tests-dir"],
    dirs: resolve(process.cwd(), "tests"),
  });

  await checkTextContent({
    globalOutFile: output,
    instructions: [
      {
        match:
          'setupFiles: [ resolve(import.meta.dirname, "tests/tests.setup.ts") ]',
        flags: ["--full", "--tests-dir"],
      },
    ],
    action,
  });
});
