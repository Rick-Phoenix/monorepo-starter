import { join } from "node:path";
import { describe, it } from "vitest";
import { genVitestConfig } from "../src/cli/gen_vitest_config.js";
import {
  checkDirResolutionCli,
  checkDirsCreation,
  checkFilesCreation,
  checkTextContent,
} from "./lib/memfs.js";

const outputFile = join(process.cwd(), "vitest.config.ts");
const action = genVitestConfig;

describe("testing the gen-vitest cli", () => {
  it("generates the tests dir and the setup files", async () => {
    await action(["--tests-dir", "--full"]);
    checkDirsCreation({
      dirs: ["tests"],
    });

    checkTextContent({
      outputFile,
      match:
        'setupFiles: [ resolve(import.meta.dirname, "tests/tests.setup.ts") ]',
    });

    checkFilesCreation({
      files: ["vitest.config.ts", "tests/tests.setup.ts"],
      log: true,
    });
  });

  checkDirResolutionCli({
    outputPath: "vitest.config.ts",
    action,
  });
});
