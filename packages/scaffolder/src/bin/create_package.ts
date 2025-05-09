#!/usr/bin/env node

// eslint-disable no-useless-spread
// eslint-disable no-console

import { cancel, intro, log, outro } from "@clack/prompts";
import {
  assertReadableWritableFile,
  confirm,
  multiselect,
  objectIsEmpty,
  promptIfDirNotEmpty,
  select,
  text,
  tryThrow,
  tryWarn,
  tryWarnChildProcess,
  writeAllTemplates,
  writeRender,
} from "@monorepo-starter/utils";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readPackage } from "read-pkg";
import YAML from "yaml";
import { createPackageCli } from "../cli/create_package_cli.js";
import { genEslintConfigCli } from "../cli/gen_eslint_config.js";
import { genOxlintConfigCli } from "../cli/gen_oxlint_config.js";
import { genTsdownConfigCli } from "../cli/gen_tsdown_config.js";
import { genVitestConfigCli } from "../cli/gen_vitest_config.js";
import {
  generalOptionalPackages,
  getPackagesWithLatestVersions,
  presetPackages,
} from "../lib/packages_list.js";

// Hardcoded for now
const pkgManager = "pnpm";

const cliArgs = createPackageCli();

const monorepoRoot = process.cwd();

const rootPackageJson = await tryThrow(
  readPackage({ cwd: monorepoRoot }),
  "reading the root's package.json file (are you launching this process in the root of your monorepo?)",
);

async function initializePackage() {
  intro("📦 New package initialization 📦");

  const projectName: string = rootPackageJson.name ||
    await text({
      message: "What is the name of your monorepo?",
      placeholder: "myrepo",
    });

  const packageName = cliArgs.name || await text({
    message: `Enter the package's name:`,
    validate: (input) => {
      if (!input || !input.length) {
        cancel("The package name cannot be empty.");
        process.exit(1);
      }

      return undefined;
    },
  });

  const outputDir = resolve(monorepoRoot, cliArgs.dir, packageName);

  const dirIsOk = await promptIfDirNotEmpty(outputDir);

  if (!dirIsOk) process.exit(0);

  const packageDescription = cliArgs.description ?? await text({
    message: `Enter the package's description:`,
    defaultValue: "",
  });

  if (cliArgs.preset) {
    cliArgs.preset.forEach((p) =>
      log.success(`✅ Preset ${p} added to the list of dependencies.`)
    );
  }

  if (cliArgs.add) {
    log.success(
      `✅ Added ${cliArgs.add.length} extra packages to the list of dependencies.`,
    );
  }

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

  if (cliArgs.preset) {
    const presetChoices = new Set(cliArgs.preset);
    presetPackages.forEach((pac) => {
      if (pac.presets) {
        pac.presets.forEach((pr) => {
          if (presetChoices.has(pr)) {
            if (!selectedPackages.has(pac.name)) {
              additionalPackages.push(pac);
              selectedPackages.add(pac.name);
            }
          }
        });
      }
    });
  }

  if (cliArgs.add) {
    cliArgs.add.forEach((p) => {
      if (!selectedPackages.has(p)) {
        selectedPackages.add(p);
        additionalPackages.push({ name: p });
      }
    });
  }

  const oxlint = selectedPackages.has("oxlint");
  const selectedEslint = selectedPackages.has("eslint");

  const includeEnvParsingModule = cliArgs.env ?? await confirm({
    message: "Do you want to include an env parsing module?",
    initialValue: false,
  });

  if (includeEnvParsingModule) {
    const necessaryDeps = ["arktype", "dotenv", "dotenv-expand"];
    necessaryDeps.forEach((dep) => {
      if (!selectedPackages.has(dep)) {
        selectedPackages.add(dep);
        additionalPackages.push({
          name: dep,
          isDev: dep !== "arktype",
          catalog: true,
        });
      }
    });
  }

  const eslintConfigSourceType =
    cliArgs.lintSource === "none" || !selectedEslint
      ? ""
      : cliArgs.lintSource ||
        await select({
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
        });

  const eslintConfigSourceName = eslintConfigSourceType === "workspace" ||
      eslintConfigSourceType === "external"
    ? await text({
      message: "What's the name of the config package that you want to extend?",
      initialValue: eslintConfigSourceType === "workspace"
        ? `@${projectName}/linting-config`
        : "",
      placeholder: eslintConfigSourceType === "workspace"
        ? `@${projectName}/linting-config`
        : "",
    })
    : "";

  if (eslintConfigSourceName) {
    const isWorkspace = eslintConfigSourceType === "workspace";
    additionalPackages.push({
      name: eslintConfigSourceName,
      isDev: true,
      isWorkspace,
    });
  } else {
    additionalPackages.push({
      name: "@antfu/eslint-config",
      isDev: true,
      catalog: true,
    });
  }

  const oxlintConfigType = oxlint && !cliArgs.skipConfigs
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
      message: "What's the path for the oxlint config to extend?",
      initialValue: "../../.oxlintrc.json",
      placeholder: "../../.oxlintrc.json",
    })
    : "";

  const templatesDir = join(import.meta.dirname, "../templates");

  const { dependencies, devDependencies, catalogEntries } = await tryThrow(
    getPackagesWithLatestVersions(
      additionalPackages,
      { catalog: cliArgs.catalog },
    ),
    "fetching the latest versions for the package's dependencies",
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

  const oxlintCommand = !oxlint
    ? ""
    : oxlintConfigType === "root"
    ? "oxlint -c ../../.oxlintrc.json"
    : "oxlint";
  const separator = oxlint && eslintConfigSourceType ? " && " : "";
  const eslintCommand = eslintConfigSourceType ? "eslint" : "";
  const lintCommand = oxlintCommand.concat(separator).concat(eslintCommand);

  const templatesCtx = {
    devDependencies,
    dependencies,
    projectName,
    packageName,
    packageDescription,
    eslintConfigSourceName,
    lintCommand,
  };

  await tryThrow(
    writeAllTemplates({
      ctx: templatesCtx,
      templatesDir: join(templatesDir, "new_pkg"),
      targetDir: outputDir,
    }),
    "writing the files to the new package's root directory",
  );

  if (eslintConfigSourceType) {
    if (eslintConfigSourceType === "new") {
      const oxlintArgs: string[] = [];
      if (oxlint) {
        oxlintArgs.push("-o");
        if (oxlintConfigType !== "root") {
          oxlintArgs.push("--oxlint-config", "./.oxlintrc.json");
        }
      }
      await genEslintConfigCli([
        "-d",
        outputDir,
        "-k",
        "minimal",
        ...oxlintArgs,
      ]);
    } else {
      await genEslintConfigCli([
        "-d",
        outputDir,
        "-k",
        "extended",
        "-e",
        eslintConfigSourceName,
      ]);
    }
  }

  if (selectedPackages.has("vitest") && !cliArgs.skipConfigs) {
    const vitestSetup = cliArgs.defaultConfigs ? true : await confirm({
      message:
        "Do you want to set up the config file and tests directory for vitest?",
      initialValue: true,
    });

    if (vitestSetup) {
      const testsDir = cliArgs.testsDir ||
        (cliArgs.defaultConfigs ? "tests" : await text({
          message:
            "Enter the path to the tests directory (relative to the package's root)",
          initialValue: "tests",
          placeholder: "tests",
        }));

      await genVitestConfigCli([
        "-d",
        outputDir,
        "--tests-dir",
        testsDir,
        "--script",
      ]);
    }
  }

  if (selectedPackages.has("tsdown") && !cliArgs.skipConfigs) {
    const tsdownSetup = cliArgs.defaultConfigs ? true : await confirm({
      message: "Do you want to generate a tsdown config file?",
      initialValue: true,
    });

    if (tsdownSetup) {
      await genTsdownConfigCli([
        "-d",
        outputDir,
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
    await tryWarn(
      writeRender(templatePath, join(targetDir, "env_parsing.ts")),
      "writing the env parsing module",
    );
  }

  const installDeps = cliArgs.install ?? await confirm({
    message: `Do you want to run '${pkgManager} install'?`,
    initialValue: true,
  });

  if (installDeps) {
    tryWarnChildProcess(() =>
      spawnSync(`${pkgManager} install`, {
        stdio: "inherit",
        shell: true,
        cwd: outputDir,
      }), `installing dependencies with ${pkgManager}`);
  }

  outro(
    `📦 The package '${packageName}' has been successfully initialized. 🚀✅`,
  );
}

await initializePackage();
