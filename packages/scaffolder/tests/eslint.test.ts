import { join } from "node:path";
import { describe } from "vitest";
import { genEslintConfig } from "../src/cli/gen_eslint_config.js";
import { checkDirResolution, checkTextContent } from "./lib/memfs.js";

const output = join(process.cwd(), "eslint.config.js");
const action = genEslintConfig;

describe("testing the gen-eslint cli", async () => {
  await checkDirResolution({
    checks: [{ outputPath: "eslint.config.js" }],
    action,
  });

  await checkTextContent({
    globalOutFile: output,
    checks: [
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
