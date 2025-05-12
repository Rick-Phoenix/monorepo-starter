import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { genMoonConfig } from "../src/cli/init_moon.js";
import { checkFileCreation } from "./lib/memfs.js";

const outputDir = join(process.cwd(), ".moon");
const tasksFile = join(outputDir, "tasks.yml");
const outputFiles = ["toolchain.yml", "workspace.yml", "tasks.yml"].map((f) =>
  join(outputDir, f)
);
const action = genMoonConfig;

describe("testing the init-moon cli", async () => {
  // await checkDirsCreation({
  //   dirs: ".moon",
  //   action,
  // });

  await checkFileCreation({
    outputFiles,
    action,
  });

  it("resets the temporary volume after each test", () => {
    expect(existsSync(outputDir)).toBe(false);
  });

  // await checkDirResolution({
  //   filename: ".moon/tasks.yml",
  //   action,
  // });

  // await checkTextContent({
  //   globalOutFile: outputDir,
  //   instructions: [
  //     {
  //       match:
  //         'setupFiles: [ resolve(import.meta.dirname, "tests/tests.setup.ts") ]',
  //       flags: ["--full", "--tests-dir"],
  //     },
  //   ],
  //   action,
  // });
});
