import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { genEslintConfig } from "../src/cli/gen_eslint_config.js";
import {
  checkDirResolution,
  checkFileCreation,
  checkTextContent,
} from "./lib/memfs.js";

const output = join(process.cwd(), "eslint.config.js");
const action = genEslintConfig;

describe("testing the gen-eslint cli", async () => {
  await checkFileCreation({
    outputFiles: output,
    action,
  });

  it("resets the temporary volume after each test", () => {
    expect(existsSync(output)).toBe(false);
  });

  await checkDirResolution({
    filename: "eslint.config.js",
    action,
  });

  await checkTextContent({
    globalOutFile: output,
    instructions: [
      {
        match: "createEslintConfig",
      },
      {
        match: 'import { antfu } from "@antfu/eslint-config"',
        flags: ["-k", "extended"],
        noMatch: true,
      },
      {
        match: 'import oxlint from "eslint-plugin-oxlint"',
        flags: ["-o"],
      },
      {
        match: 'import eslintConfigPrettier from "eslint-config-prettier"',
        flags: ["--no-prettier"],
        noMatch: true,
      },
    ],
    action,
  });
});
