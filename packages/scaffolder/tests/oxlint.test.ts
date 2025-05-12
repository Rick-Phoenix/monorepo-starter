import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { genOxlintConfig } from "../src/cli/gen_oxlint_config.js";
import {
  checkDirResolution,
  checkFileCreation,
  checkFlags,
} from "./lib/memfs.js";

const output = join(process.cwd(), ".oxlintrc.json");
const action = genOxlintConfig;

describe("Testing the gen-oxlint cli", async () => {
  await checkFileCreation({
    outputFiles: output,
    action,
  });

  it("resets the temporary volume after each test", () => {
    expect(existsSync(output)).toBe(false);
  });

  await checkFlags({
    action,
    flags: [undefined, ["--no-extend"], ["-k", "opinionated"]],
    outputPath: output,
    expectedValue: undefined,
    fieldToCheck: "extends",
  });

  await checkFlags({
    action,
    flags: [["-k", "minimal"]],
    outputPath: output,
    expectedValue: ["../../.oxlintrc.json"],
    fieldToCheck: "extends",
  });

  await checkDirResolution({
    filename: ".oxlintrc.json",
    action,
  });
});
