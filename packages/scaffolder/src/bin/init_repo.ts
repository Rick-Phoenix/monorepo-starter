#!/usr/bin/env node

// eslint-disable no-console
import { intro, outro } from "@clack/prompts";
import {
  confirm,
  multiselect,
  promptIfDirNotEmpty,
  recursiveRender,
  select,
  text,
  tryThrow,
  tryWarn,
  tryWarnChildProcess,
  writeRender,
} from "@monorepo-starter/utils";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { genEslintConfig } from "../cli/gen_eslint_config.js";
import { genOxlintConfig } from "../cli/gen_oxlint_config.js";
import { genMoonConfig } from "../cli/init_moon.js";
import { initRepoCli } from "../cli/init_repo_cli.js";
import { packageManagers } from "../lib/install_package.js";
import {
  getLintPackageDeps,
  getPackagesWithLatestVersions,
  optionalRootPackages,
} from "../lib/packages_list.js";

const res = resolve;

const cliArgs = initRepoCli();

intro("✨ Monorepo Initialization ✨");

const projectName = cliArgs.name || await text({
  message: "Enter the project's name:",
  defaultValue: "playground",
  placeholder: "playground",
});

const chosenLocation = cliArgs.directory || await text({
  message: "Where do you want to create the new monorepo?",
  defaultValue: projectName,
  placeholder: projectName,
});

const packageManager = cliArgs.packageManager || await select({
  message: "What is your package manager?",
  options: packageManagers.map((pm) => ({
    label: pm,
    value: pm,
  })),
  initialValue: "pnpm",
});

const installPath = res(process.cwd(), chosenLocation);

const dirIsOk = await promptIfDirNotEmpty(installPath);

if (!dirIsOk) {
  process.exit(1);
}

await tryThrow(
  mkdir(installPath),
  "creating the root directory for the new monorepo",
);

const rootPackages = await multiselect({
  message: "Select packages to add to your workspace root (optional):",
  options: optionalRootPackages.map((pac) => ({
    label: pac.label || pac.name[0]!.toUpperCase() + pac.name.slice(1),
    value: pac,
  })),
  initialValues: optionalRootPackages.filter((p) => p.preSelected),
  required: false,
});

const selectedPackages = new Set(rootPackages.map((p) => p.name));

const addGitHook = selectedPackages.has("husky")
  ? await confirm({
    message: "Do you want to create a pre-commit hook for husky?",
    initialValue: true,
  })
  : false;

const hooksOptions = [];

if (addGitHook) {
  if (selectedPackages.has("husky")) {
    hooksOptions.push({
      value: "lintStaged",
      label: "Lint-staged",
      hint: "Runs linting checks on committed files",
    });
  }

  if (selectedPackages.has("@infisical/cli")) {
    hooksOptions.push({
      label: "Infisical scan",
      value: "infisical",
      hint: "Runs automatic checks for potential secrets leaks",
    });
  }
}

const hookActions = hooksOptions.length
  ? await multiselect({
    message: "What do you want to add to the pre-commit hook?",
    options: hooksOptions,
    initialValues: ["lintStaged"],
    cursorAt: "infisical",
  })
  : [];

const lintConfig = cliArgs.lint ?? await select({
  message: "Do you want to add an internal linting config package?",
  options: [{
    value: "opinionated",
    label: "Yes, with opinionated defaults",
  }, {
    value: "minimal-extensible",
    label: "Yes, with minimal defaults",
  }, {
    value: "",
    label: "No, thank you.",
  }],
  initialValue: "opinionated",
});

const oxlint = cliArgs.oxlint ?? await select({
  message: "Do you want to add an oxlint config?",
  options: [
    {
      label: "Yes, with opinionated defaults",
      value: "opinionated",
    },
    {
      label: "Yes, with minimal defaults",
      value: "minimal",
    },
    {
      label: "No, thank you.",
      value: "",
    },
  ],
  initialValue: "opinionated",
});

const rootDirs = {
  packages: join(installPath, "packages"),
  ...(addGitHook && { husky: join(installPath, ".husky") }),
};

for (const [name, path] of Object.entries(rootDirs)) {
  await tryThrow(mkdir(path), `creating the directory for ${name} at ${path}`);
}

const templatesDir = join(import.meta.dirname, "../templates");

const { dependencies, devDependencies, catalogEntries } = await tryThrow(
  getPackagesWithLatestVersions(
    rootPackages,
    { catalog: cliArgs.catalog },
  ),
  "fetching the latest versions for the selected packages",
);

const lintConfigName = cliArgs.lintName;

const oxlintCommand = oxlint ? "oxlint -c ../../.oxlintrc.json && " : "";
const lintCommand = oxlintCommand.concat("eslint");

const templatesCtx = {
  catalog: cliArgs.catalog,
  dependencies,
  devDependencies,
  catalogEntries,
  projectName,
  oxlint,
  hooks: {
    infisical: hookActions.includes("infisical"),
    lintStaged: hookActions.includes("lintStaged"),
  },
  lintConfig,
  lintConfigName,
  lintCommand,
  packageJsonWorkspaces: packageManager !== "pnpm",
};

await tryThrow(
  recursiveRender({
    ctx: templatesCtx,
    templatesDir: join(templatesDir, "monorepo_root"),
    outputDir: installPath,
  }),
  "writing the files at the new monorepo's root",
);

if (packageManager === "pnpm") {
  await tryThrow(
    writeRender({
      templateFile: join(templatesDir, "configs/pnpm-workspace.yaml.j2"),
      outputDir: installPath,
      ctx: { catalog: cliArgs.catalog, catalogEntries },
    }),
    "writing the pnpm-workspace file",
  );
}

if (cliArgs.moon) {
  await genMoonConfig([
    "-d",
    installPath,
  ]);
}

if (oxlint) {
  await genOxlintConfig([
    "--no-extend",
    "-d",
    installPath,
    "-k",
    oxlint,
  ]);
}

if (lintConfig) {
  const lintPkgTemplatesDir = join(templatesDir, "linting-config");
  const targetDir = join(installPath, "packages", lintConfigName);
  await tryThrow(
    mkdir(targetDir, { recursive: true }),
    "creating the lint config package's directory",
  );

  await tryThrow(
    recursiveRender({
      ctx: {
        ...templatesCtx,
        lintConfigDeps: await getLintPackageDeps({
          oxlint: !!oxlint,
          catalog: cliArgs.catalog,
        }),
      },
      outputDir: targetDir,
      templatesDir: lintPkgTemplatesDir,
    }),
    "writing the files for the lint config package",
  );

  const args = [
    "-d",
    targetDir,
    "--kind",
    lintConfig,
  ];

  if (!oxlint) args.push("--no-oxlint");

  await genEslintConfig(args);
}

if (hookActions.length) {
  await tryWarn(
    recursiveRender({
      templatesDir: join(templatesDir, "git_hooks"),
      outputDir: join(installPath, ".husky"),
      ctx: templatesCtx,
    }),
    "creating the pre-commit hook file",
  );
}

const installDeps = cliArgs.install ?? await confirm({
  message: `Do you want to run '${packageManager} install'?`,
  initialValue: false,
});

const installOk = installDeps
  ? tryWarnChildProcess(() =>
    spawnSync(`${packageManager} install`, {
      shell: true,
      stdio: "inherit",
      cwd: installPath,
    }), `installing dependencies with ${packageManager}`)
  : false;

const gitInit = cliArgs.git ?? await confirm({
  message: "Do you want to start a new git repo?",
  initialValue: true,
});

if (gitInit) {
  tryWarnChildProcess(() =>
    spawnSync("git init", {
      shell: true,
      stdio: "inherit",
      cwd: installPath,
    }), "creating a new git repo");

  if (hookActions.length && installOk) {
    const execCmd = packageManager === "bun"
      ? "bunx"
      : `${packageManager} exec`;
    tryWarnChildProcess(() =>
      spawnSync(`${execCmd} husky`, {
        shell: true,
        stdio: "inherit",
        cwd: installPath,
      }), "initializing husky");
  }
}

outro(
  `✅ Operation completed! Your new monorepo is now up and running! 🚀`,
);
