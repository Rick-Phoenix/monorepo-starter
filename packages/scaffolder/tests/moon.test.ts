import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { genMoonConfig } from "../src/cli/init_moon.js";
import { installPackages } from "../src/lib/install_package.js";
import {
  checkDirResolution,
  checkFileCreation,
  checkTextContent,
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
  await checkFileCreation({
    action,
    checks: [
      {
        outputFiles,
      },
    ],
  });

  it("resets the temporary volume after each test", () => {
    expect(existsSync(outputDir)).toBe(false);
  });

  it("calls the install command correctly", async () => {
    await genMoonConfig(["-i"]);
    expect(installPackages).toHaveBeenCalledWith(
      "@moonrepo/cli",
      "pnpm",
      true,
    );
    expect(installPackages).toHaveReturnedWith("@moonrepo/cli");
  });

  await checkDirResolution({
    checks: [
      {
        outputPath: ".moon/tasks.yml",
      },
    ],
    action,
  });

  await checkTextContent({
    checks: [
      {
        match: "build",
        flags: ["-t", "build"],
        outFile: tasksFile,
      },
    ],
    action,
  });

  checkYamlOutput({
    action,
    checks: [
      {
        flags: ["--package-manager", "bun"],
        outputFile: toolchainFile,
        fieldToCheck: "node.packageManager",
        expectedValue: "bun",
      },
      {
        flags: ["--project-tsconfig", "tsconfig.test.json"],
        fieldToCheck: "typescript.projectConfigFileName",
        expectedValue: "tsconfig.test.json",
        outputFile: toolchainFile,
      },
      {
        flags: ["--root-options-tsconfig", "tsconfig.root.json"],
        fieldToCheck: "typescript.rootOptionsConfigFileName",
        expectedValue: "tsconfig.root.json",
        outputFile: toolchainFile,
      },
      {
        flags: ["--no-tasks"],
        fieldToCheck: "tasks",
        expectedValue: null,
        outputFile: tasksFile,
      },
      {
        fieldToCheck: "tasks.test",
        expectedValue: "object",
        outputFile: tasksFile,
      },
    ],
  });
});
