import { join } from "node:path";
import { describe } from "vitest";
import { genOxlintConfig } from "../src/cli/gen_oxlint_config.js";
import { checkDirResolution, checkSingleJsonOutput } from "./lib/memfs.js";

const output = join(process.cwd(), ".oxlintrc.json");
const action = genOxlintConfig;

describe("testing the gen-oxlint cli", async () => {
  checkSingleJsonOutput({
    action,
    flags: [undefined, ["--no-extend"], ["-k", "opinionated"]],
    outputFile: output,
    expectedValue: undefined,
    fieldToCheck: "extends",
  });

  checkSingleJsonOutput({
    action,
    flags: [["-k", "minimal"]],
    outputFile: output,
    expectedValue: ["../../.oxlintrc.json"],
    fieldToCheck: "extends",
  });

  await checkDirResolution({
    checks: [
      {
        outputPath: ".oxlintrc.json",
      },
    ],
    action,
  });
});
