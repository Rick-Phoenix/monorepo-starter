import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { genScripts } from "../src/cli/gen_scripts.js";
import {
  checkDirResolution,
  checkFileCreation,
  checkYamlOutput,
} from "./lib/memfs.js";

const scriptsDir = join(process.cwd(), "scripts");
const moonFile = join(process.cwd(), "moon.yml");
const action = genScripts;

describe("testing the gen-scripts cli", async () => {
  await checkFileCreation({
    action,
    checks: [
      {
        outputFiles: [join(scriptsDir, "barrel.ts")],
        flags: ["-p", "barrel"],
      },
    ],
  });

  it("resets the temporary volume after each test", () => {
    expect(existsSync(scriptsDir)).toBe(false);
  });

  checkYamlOutput({
    action,
    checks: [
      {
        flags: ["--moon", "-p", "barrel"],
        outputFile: moonFile,
        fieldToCheck: "tasks.barrel",
        expectedValue: "object",
      },
      {
        flags: ["--moon"],
        outputFile: moonFile,
        fieldToCheck: "tasks",
        expectedValue: null,
      },
    ],
  });

  await checkDirResolution({
    action,
    checks: [
      {
        outputPath: "scripts",
        dirFlag: "-r",
      },
      {
        outputPath: "moon.yml",
        dirFlag: "-r",
        flags: ["--moon"],
      },
    ],
  });
});
