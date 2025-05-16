import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { genMoonConfig } from "../src/cli/init_moon.js";
import { installPackages } from "../src/lib/install_package.js";
import {
  checkDirResolutionCli,
  checkFilesCreation,
  checkYamlOutput,
} from "./lib/memfs.js";

const outputDir = join(process.cwd(), ".moon");
const tasksFile = join(outputDir, "tasks.yml");
const toolchainFile = join(outputDir, "toolchain.yml");
const outputFiles = ["toolchain.yml", "workspace.yml", "tasks.yml"].map((f) =>
  join(outputDir, f)
);
const action = genMoonConfig;

describe("testing the init-moon cli", async () => {
  it("generates the config files", async () => {
    await genMoonConfig([
      "-i",
      "--tasks",
      "--package-manager",
      "bun",
      "--project-tsconfig",
      "tsconfig.test.json",
      "--root-options-tsconfig",
      "tsconfig.root.json",
    ]);
    checkFilesCreation({ files: outputFiles });
    expect(installPackages).toHaveBeenCalledWith(
      "@moonrepo/cli",
      "bun",
      true,
    );
    expect(installPackages).toHaveReturnedWith("@moonrepo/cli");
    checkYamlOutput({
      outputFile: toolchainFile,
      checks: [
        {
          property: "node.packageManager",
          expected: "bun",
        },
        {
          property: "typescript.projectConfigFileName",
          expected: "tsconfig.test.json",
        },
        {
          property: "typescript.rootOptionsConfigFileName",
          expected: "tsconfig.root.json",
        },
      ],
    });
    checkYamlOutput({
      property: "tasks",
      expected: "object",
      kind: "typeof",
      outputFile: tasksFile,
    });
  });

  checkDirResolutionCli({
    outputPath: ".moon/tasks.yml",
    action,
  });
});
