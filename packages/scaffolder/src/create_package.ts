#!/usr/bin/env node

// eslint-disable no-useless-spread
// eslint-disable no-console

import { cancel, intro, outro } from "@clack/prompts";
import {
  confirm,
  getLatestVersionRange,
  getUnsafePathChar,
  isValidPathComponent,
  multiselect,
  promptIfDirNotEmpty,
  select,
  text,
  writeAllTemplates,
  writeRender,
} from "@monorepo-starter/utils";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readPackageSync } from "read-pkg";
import { createPackageCli } from "./lib/cli.js";
import {
  getPackagesWithLatestVersions,
  type OptionalPackage,
  optionalPackages,
} from "./lib/packages_list.js";

// Hardcoded for now
const pkgManager = "pnpm";

const cliArgs = createPackageCli();

const monorepoRoot = cliArgs.cwd || process.cwd();

const rootPackageJson = readPackageSync({ cwd: monorepoRoot });

const projectName: string = rootPackageJson.name;
if (!projectName.length) {
  throw new Error(
    "Could not find the project name. Is package.json set up correctly?",
  );
}

async function initializePackage() {
  intro("📦 Initializing new package 📦");

  const packageName = cliArgs.name || await text({
    message: `Enter the package's name:`,
    validate: (input) => {
      if (!input || !input.length) {
        cancel("The package name cannot be empty.");
        process.exit(1);
      }

      if (!isValidPathComponent(input)) {
        const unsafeChar = getUnsafePathChar(input);
        cancel(`The name contains an invalid character: '${unsafeChar}'`);
        process.exit(1);
      }
      return undefined;
    },
  });

  const outputDir = resolve(monorepoRoot, cliArgs.directory, packageName);

  const dirIsOk = await promptIfDirNotEmpty(outputDir);

  if (!dirIsOk) process.exit(0);

  const packageDescription = cliArgs.description ?? await text({
    message: `Enter the package's description:`,
    defaultValue: "",
    placeholder: "",
  });

  // Section - Adding additional packages
  const additionalPackages = await multiselect({
    message:
      "Do you want to install additional packages? (Select with spacebar)",
    options: optionalPackages.map((pac) => ({
      value: pac,
      label: `${pac[0]?.toUpperCase()}${pac.slice(1)}`,
    })),
    required: false,
  }) as OptionalPackage[];

  const includeEnvParsingModule = cliArgs.env ?? await confirm({
    message: "Do you want to include an env parsing module?",
    initialValue: false,
  });

  if (includeEnvParsingModule === true) {
    additionalPackages.push(...["arktype", "dotenv", "dotenv-expand"]);
  }

  const lintConfigSource = cliArgs.lintSource || await select({
    message: "Do you use a local or external linting config?",
    options: [
      {
        label: "Local",
        value: "local",
      },
      {
        label: "External",
        value: "external",
      },
    ],
  });

  const lintConfigName = cliArgs.lintName || await text({
    message: "Enter the name of your linting config package:",
    initialValue: lintConfigSource === "local"
      ? `@${projectName}/linting-config`
      : "",
    placeholder: lintConfigSource === "local"
      ? `@${projectName}/linting-config`
      : "",
  });

  const installDeps = cliArgs.install ?? await confirm({
    message: `Do you want to run '${pkgManager} install' after initialization?`,
    initialValue: true,
  });

  const templatesDir = join(import.meta.dirname, "templates");

  const { dependencies, devDependencies } = await getPackagesWithLatestVersions(
    additionalPackages,
  );

  const templatesCtx = {
    devDependencies,
    dependencies,
    projectName,
    packageName,
    packageDescription,
    lintConfigName,
    lintConfigVersion: lintConfigSource === "local"
      ? "workspace:*"
      : await getLatestVersionRange(lintConfigName),
  };

  await writeAllTemplates({
    ctx: templatesCtx,
    templatesDir: join(templatesDir, "new_pkg"),
    targetDir: outputDir,
  });

  if (includeEnvParsingModule === true) {
    const targetDir = join(outputDir, "src/lib");
    const templatePath = join(templatesDir, "modules/env_parsing.ts.j2");
    await mkdir(targetDir, { recursive: true });
    await writeRender(templatePath, join(targetDir, "env_parsing.ts"));
  }

  if (installDeps) {
    const { error } = spawnSync(`${pkgManager} install`, {
      stdio: "inherit",
      shell: true,
    });
    if (error) {
      console.warn(
        `An error occurred with ${pkgManager}: ${error}`,
      );
    }
  }

  outro(
    `'${packageName}' has been successfully initialized. 🚀✅`,
  );
}

await initializePackage();
