import { join } from "node:path";
import { describe, it } from "vitest";
import { genScripts } from "../src/cli/gen_scripts.js";
import {
  checkDirResolutionCli,
  checkFilesCreation,
  checkYamlOutput,
} from "./lib/memfs.js";

const scriptsDir = join(process.cwd(), "scripts");
const moonFile = join(process.cwd(), "moon.yml");
const action = genScripts;

describe("testing the gen-scripts cli", async () => {
  it("generates the config files", async () => {
    await action(["--moon", "-p", "barrel"]);

    checkFilesCreation({
      files: join(scriptsDir, "barrel.ts"),
    });

    checkYamlOutput({
      outputFile: moonFile,
      checks: [
        {
          property: "tasks.barrel",
          kind: "typeof",
          expected: "object",
        },
        {
          property: "tasks.build",
          expected: undefined,
        },
      ],
    });
  });

  const dirResolutionChecks = [
    {
      outputPath: "scripts",
      dirFlag: "-r",
      action,
    },
    {
      outputPath: "moon.yml",
      dirFlag: "-r",
      flags: ["--moon"],
      action,
    },
  ];

  dirResolutionChecks.forEach((c) => checkDirResolutionCli(c));
});
