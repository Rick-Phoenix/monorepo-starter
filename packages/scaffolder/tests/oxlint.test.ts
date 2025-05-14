import { join } from "node:path";
import { describe, it } from "vitest";
import { genOxlintConfig } from "../src/cli/gen_oxlint_config.js";
import { checkDirResolutionCli, checkJsonOutput } from "./lib/memfs.js";

const outputFile = join(process.cwd(), ".oxlintrc.json");
const action = genOxlintConfig;

describe("testing the gen-oxlint cli", async () => {
  it("outputs the config file", async () => {
    await action(["-k", "minimal"]);

    checkJsonOutput({
      outputFile,
      expected: ["../../.oxlintrc.json"],
      property: "extends",
    });
  });

  it("does not extend a config file for the default config", async () => {
    await action();

    checkJsonOutput({
      outputFile,
      expected: ["../../.oxlintrc.json"],
      property: "extends",
      negateResult: true,
    });
  });

  checkDirResolutionCli({
    outputPath: ".oxlintrc.json",
    action,
  });
});
