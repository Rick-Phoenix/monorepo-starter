#!/usr/bin/env node

// eslint-disable no-useless-spread
// eslint-disable no-console

import { cancel, intro, outro } from "@clack/prompts";
import {
  assertReadableWritableFile,
  confirm,
  getUnsafePathChar,
  isValidPathComponent,
  multiselect,
  objectIsEmpty,
  promptIfDirNotEmpty,
  select,
  text,
  writeAllTemplates,
  writeRender,
} from "@monorepo-starter/utils";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readPackageSync } from "read-pkg";
import YAML from "yaml";
import { createPackageCli } from "../cli/create_package_cli.js";
import { genEslintConfigCli } from "../cli/gen_eslint_config.js";
import { genOxlintConfigCli } from "../cli/gen_oxlint_config.js";
import {
  generalOptionalPackages,
  getPackagesWithLatestVersions,
} from "../lib/packages_list.js";

// Hardcoded for now
const pkgManager = "pnpm";

const cliArgs = createPackageCli();

const monorepoRoot = process.cwd();

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
    options: generalOptionalPackages.map((pac) => ({
      label: pac.label || pac.name[0]!.toUpperCase() + pac.name.slice(1),
      value: pac,
    })),
    initialValues: generalOptionalPackages.filter((p) => p.preSelected),
    required: false,
  });

  const selectedPackages = new Set(additionalPackages.map((p) => p.name));
  const selectedOxlint = selectedPackages.has("oxlint");
  const selectedEslint = selectedPackages.has("eslint");

  const includeEnvParsingModule = cliArgs.env ?? await confirm({
    message: "Do you want to include an env parsing module?",
    initialValue: false,
  });

  if (includeEnvParsingModule) {
    const necessaryDeps = generalOptionalPackages.filter((pac) =>
      ["arktype", "dotenv", "dotenv-expand"].includes(pac.name)
    );
    additionalPackages.push(...necessaryDeps);
  }

  const eslintConfigSource = selectedEslint
    ? await select({
      message: "How do you want to set up your eslint config?",
      options: [
        {
          label: "Extend it from a workspace package",
          value: "workspace",
        },
        {
          label: "Extend it from an external package",
          value: "external",
        },
        {
          label: "Make a new one from scratch",
          value: "new",
        },
      ],
    })
    : "";

  const eslintConfigName =
    eslintConfigSource === "workspace" || eslintConfigSource === "external"
      ? await text({
        message:
          "What's the name of the config package that you want to extend?",
        initialValue: eslintConfigSource === "workspace"
          ? `@${projectName}/linting-config`
          : "",
        placeholder: eslintConfigSource === "workspace"
          ? `@${projectName}/linting-config`
          : "",
      })
      : "";

  if (eslintConfigName) {
    const isWorkspace = eslintConfigSource === "workspace";
    additionalPackages.push({
      name: eslintConfigName,
      isDev: true,
      isWorkspace,
      catalog: !isWorkspace,
    });
  } else {
    additionalPackages.push({
      name: "@antfu/eslint-config",
      isDev: true,
      catalog: true,
    });
  }

  const oxlintConfigType = selectedOxlint
    ? await select({
      message: "How do you want to setup the oxlint config?",
      options: [
        {
          label: "Extend another config",
          value: "extend",
        },
        {
          label: "Make a new one (extensive)",
          value: "opinionated",
        },
        {
          label: "Make a new one (minimal)",
          value: "minimal",
        },
        {
          label: "Reuse the root config",
          value: "root",
        },
      ],
      initialValue: "root",
    })
    : "";

  const oxlintExtendPath = oxlintConfigType === "extend"
    ? await text({
      message: "What's the path for the config to extend?",
      initialValue: "../../.oxlintrc.json",
      placeholder: "../../.oxlintrc.json",
    })
    : "";

  const installDeps = cliArgs.install ?? await confirm({
    message:
      `Do you want to run '${pkgManager} install' after creating the new package?`,
    initialValue: true,
  });

  const templatesDir = join(import.meta.dirname, "../templates");

  const { dependencies, devDependencies, catalogEntries } =
    await getPackagesWithLatestVersions(
      additionalPackages,
      { catalog: cliArgs.catalog },
    );

  if (cliArgs.catalog && !objectIsEmpty(catalogEntries)) {
    const pnpmWorkspacePath = join(monorepoRoot, "pnpm-workspace.yaml");
    await assertReadableWritableFile(pnpmWorkspacePath);
    const textContent = await readFile(pnpmWorkspacePath, "utf8");
    const content = YAML.parse(textContent) as {
      catalog?: Record<string, string>;
    };

    if (content.catalog) {
      for (const [name, version] of Object.entries(catalogEntries)) {
        if (!content.catalog[name]) {
          content.catalog[name] = version;
        }
      }
    } else {
      content.catalog = {};
      for (const [name, version] of Object.entries(catalogEntries)) {
        content.catalog[name] = version;
      }
    }

    await writeFile(pnpmWorkspacePath, YAML.stringify(content));
  }

  const oxlintCommand = !selectedOxlint
    ? ""
    : oxlintConfigType === "root"
    ? "oxlint -c ../../.oxlintrc.json"
    : "oxlint";
  const separator = selectedOxlint && selectedEslint ? " && " : "";
  const eslintCommand = selectedEslint ? "eslint" : "";
  const lintCommand = oxlintCommand.concat(separator).concat(eslintCommand);

  const templatesCtx = {
    devDependencies,
    dependencies,
    projectName,
    packageName,
    packageDescription,
    eslintConfigName,
    lintCommand,
  };

  await writeAllTemplates({
    ctx: templatesCtx,
    templatesDir: join(templatesDir, "new_pkg"),
    targetDir: outputDir,
  });

  if (eslintConfigSource) {
    if (eslintConfigSource === "new") {
      await genEslintConfigCli([
        "-d",
        outputDir,
        "-k",
        "minimal",
      ]);
    } else {
      await genEslintConfigCli([
        "-d",
        outputDir,
        "-k",
        "extended",
        "-e",
        eslintConfigName,
      ]);
    }
  }

  if (oxlintConfigType && oxlintConfigType !== "root") {
    let extraArgs: string[] = [];
    if (oxlintConfigType === "extend") {
      extraArgs = [
        "-e",
        oxlintExtendPath,
      ];
    } else {
      extraArgs = [
        "-k",
        oxlintConfigType,
        "--no-extend",
      ];
    }

    await genOxlintConfigCli(["-d", outputDir, ...extraArgs]);
  }

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
