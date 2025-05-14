import { join } from "node:path";
import { describe, it } from "vitest";
import { genTsdownConfig } from "../src/cli/gen_tsdown_config.js";
import { checkDirResolutionCli, checkTextContent } from "./lib/memfs.js";

const output = join(process.cwd(), "tsdown.config.ts");
const action = genTsdownConfig;

describe("testing the gen-tsdown cli", async () => {
  checkDirResolutionCli({
    outputPath: "tsdown.config.ts",
    action,
  });

  it("outputs the config file", async () => {
    await action(["-p", "copy", "-p", "unknownPlugin"]);
    const checks = [
      'import copy from "rollup-plugin-copy"',
      'import unknownPlugin from "unknownPlugin"',
    ];

    checks.forEach((c) => checkTextContent({ match: c, outputFile: output }));
  });
});
