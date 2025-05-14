import { join } from "node:path";
import { describe, it } from "vitest";
import { genEslintConfig } from "../src/cli/gen_eslint_config.js";
import { checkDirResolutionCli, checkTextContent } from "./lib/memfs.js";

const output = join(process.cwd(), "eslint.config.js");
const action = genEslintConfig;

describe("testing the gen-eslint cli", async () => {
  checkDirResolutionCli({
    outputPath: "eslint.config.js",
    action,
  });

  it("generates the config file", async () => {
    await action(["-k", "extended", "-o", "--no-prettier"]);

    checkTextContent({
      outputFile: output,
      checks: [
        {
          match: "createEslintConfig",
        },
        {
          match: 'import { antfu } from "@antfu/eslint-config"',
          negateResult: true,
        },
        {
          match: 'import oxlint from "eslint-plugin-oxlint"',
        },
        {
          match: 'import eslintConfigPrettier from "eslint-config-prettier"',
          negateResult: true,
        },
      ],
    });
  });
});
