import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { genTsdownConfig } from "../src/cli/gen_tsdown_config.js";
import {
  checkDirResolution,
  checkFileCreation,
  checkTextContent,
} from "./lib/memfs.js";

const output = join(process.cwd(), "tsdown.config.ts");
const action = genTsdownConfig;

describe("testing the gen-tsdown cli", async () => {
  await checkFileCreation({
    outputFiles: output,
    action,
  });

  it("resets the temporary volume after each test", () => {
    expect(existsSync(output)).toBe(false);
  });

  await checkDirResolution({
    filename: "tsdown.config.ts",
    action,
  });

  await checkTextContent({
    globalOutFile: output,
    instructions: [
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
