import { join } from "node:path";
import { describe } from "vitest";
import { genTsdownConfig } from "../src/cli/gen_tsdown_config.js";
import { checkDirResolution, checkTextContent } from "./lib/memfs.js";

const output = join(process.cwd(), "tsdown.config.ts");
const action = genTsdownConfig;

describe("testing the gen-tsdown cli", async () => {
  await checkDirResolution({
    checks: [
      {
        outputPath: "tsdown.config.ts",
      },
    ],
    action,
  });

  await checkTextContent({
    globalOutFile: output,
    checks: [
      {
        match: 'import copy from "rollup-plugin-copy"',
        flags: ["-p", "copy"],
      },
      {
        match: 'import unknownPlugin from "unknownPlugin"',
        flags: ["-p", "unknownPlugin"],
      },
    ],
    action,
  });
});
