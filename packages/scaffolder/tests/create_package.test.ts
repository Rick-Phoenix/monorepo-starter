import { vol } from "memfs";
import { join } from "node:path";
import { beforeEach, describe } from "vitest";
import { initializePackage } from "../src/cli/create_package.js";
import {
  checkDirResolution,
  checkFileCreation,
  checkJsonOutput,
  checkYamlOutput,
} from "./lib/memfs.js";

const packageName = "testPackage";
const outputDir = join(process.cwd(), "packages", packageName);
const packageJson = join(outputDir, "package.json");

const action = initializePackage;
const baseFlags = [
  "-n",
  packageName,
  "--no-description",
  "--package-manager",
  "pnpm",
  "--no-install",
  "--no-additional-packages",
  "--no-env",
];

beforeEach(async () => {
  vol.fromJSON({
    [join(process.cwd(), "package.json")]: `{"name": "testproj"}`,
    [join(process.cwd(), "pnpm-workspace.yaml")]: ``,
  });
});

describe("testing the create-package cli", async () => {
  await checkDirResolution({
    action,
    checks: [
      {
        outputPath: `${packageName}/package.json`,
        flags: baseFlags,
      },
    ],
  });

  await checkFileCreation({
    action,
    checks: [
      {
        flags: baseFlags,
        outputFiles: packageJson,
      },
      {
        flags: baseFlags.concat(["--env"]),
        outputFiles: join(outputDir, "src/lib/env.ts"),
      },
      {
        flags: baseFlags.concat(["--scripts", "barrel", "--moon"]),
        outputFiles: [
          join(outputDir, "scripts/barrel.ts"),
          join(outputDir, "moon.yml"),
        ],
      },
      {
        flags: baseFlags.concat([
          "--dev-tsconfig",
          "tsconfig.spec.json",
          "--src-tsconfig",
          "tsconfig.build.json",
        ]),
        outputFiles: [
          join(outputDir, "tsconfig.spec.json"),
          join(outputDir, "tsconfig.build.json"),
        ],
      },
      {
        flags: baseFlags.concat([
          "-a",
          "tsdown",
          "-a",
          "vitest",
          "--default-configs",
        ]),
        outputFiles: [
          join(outputDir, "tsdown.config.ts"),
          join(outputDir, "vitest.config.ts"),
        ],
      },
    ],
  });

  checkJsonOutput({
    action,
    checks: [
      {
        flags: baseFlags.concat(["--root-tsconfig", "tsconfig.root.json"]),
        outputFile: join(outputDir, "tsconfig.json"),
        fieldToCheck: "extends",
        expectedValue: "../../tsconfig.root.json",
      },
      {
        flags: baseFlags.concat([
          "-a",
          "vitest",
          "--default-configs",
        ]),
        outputFile: packageJson,
        fieldToCheck: "scripts.test",
        expectedValue: "vitest run",
      },
    ],
  });

  checkYamlOutput({
    action,
    checks: [
      {
        flags: baseFlags.concat(["--catalog"]),
        outputFile: join(process.cwd(), "pnpm-workspace.yaml"),
        fieldToCheck: "catalog",
        expectedValue: "object",
      },
      {
        flags: baseFlags.concat(["--scripts", "barrel", "--moon"]),
        outputFile: join(outputDir, "moon.yml"),
        fieldToCheck: "tasks.barrel",
        expectedValue: "object",
      },
    ],
  });
});
