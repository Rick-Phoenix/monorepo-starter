import type { YamlOrJsonCheckOpts } from "@monorepo-starter/utils";
import { vol } from "memfs";
import { join } from "node:path";
import { beforeEach, describe, it } from "vitest";
import { initializePackage } from "../src/cli/create_package.js";
import {
  checkDirResolutionCli,
  checkFilesCreation,
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
  checkDirResolutionCli({
    action,
    outputPath: `${packageName}/package.json`,
    flags: baseFlags,
  });

  it("creates the config files", async () => {
    const flags = baseFlags.concat([
      "--scripts",
      "barrel",
      "--moon",
      "--env",
      "--dev-tsconfig",
      "tsconfig.spec.json",
      "--src-tsconfig",
      "tsconfig.build.json",
      "--root-tsconfig",
      "tsconfig.root.json",
      "-a",
      "tsdown",
      "-a",
      "vitest",
      "--default-configs",
      "--catalog",
    ]);

    await action(flags);

    checkFilesCreation({
      files: [
        join(outputDir, "scripts/barrel.ts"),
        join(outputDir, "moon.yml"),
        packageJson,
        join(outputDir, "src/lib/env.ts"),
        join(outputDir, "tsconfig.spec.json"),
        join(outputDir, "tsconfig.build.json"),
        join(outputDir, "tsdown.config.ts"),
        join(outputDir, "vitest.config.ts"),
      ],
    });

    const jsonChecks: YamlOrJsonCheckOpts[] = [
      {
        outputFile: join(outputDir, "tsconfig.json"),
        property: "extends",
        expected: "../../tsconfig.root.json",
      },
      {
        outputFile: packageJson,
        property: "scripts.test",
        expected: "vitest run",
      },
    ];

    jsonChecks.forEach((c) => checkJsonOutput(c));

    const yamlChecks: YamlOrJsonCheckOpts[] = [
      {
        outputFile: join(process.cwd(), "pnpm-workspace.yaml"),
        property: "catalog",
        expected: "object",
        kind: "typeof",
      },
      {
        outputFile: join(outputDir, "moon.yml"),
        property: "tasks.barrel",
        expected: "object",
        kind: "typeof",
      },
    ];

    yamlChecks.forEach((c) => checkYamlOutput(c));
  });
});
