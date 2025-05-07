#!/usr/bin/env node

// eslint-disable no-console
import { intro, outro } from "@clack/prompts";
import {
  confirm,
  multiselect,
  promptIfDirNotEmpty,
  select,
  text,
  tryThrow,
  writeAllTemplates,
} from "@monorepo-starter/utils";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { genEslintConfigCli } from "./cli/gen_eslint_config.js";
import { genOxlintConfigCli } from "./cli/gen_oxlint_config.js";
import { initRepoCli } from "./cli/init_repo_cli.js";
import {
  getLintPackageDeps,
  getPackagesWithLatestVersions,
  optionalRootPackages,
} from "./lib/packages_list.js";

const res = resolve;

// Hardcoded for now
const pkgManager = "pnpm";

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

const installPath = res(process.cwd(), chosenLocation);

const dirIsOk = await promptIfDirNotEmpty(installPath);

if (!dirIsOk) {
  process.exit(0);
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
    label: "No, thank you. My code is always perfect.",
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
      label: "Nah, I am not into all that oxidation stuff",
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

const templatesDir = join(import.meta.dirname, "templates");

const { dependencies, devDependencies, catalogEntries } =
  await getPackagesWithLatestVersions(
    rootPackages,
    { catalog: cliArgs.catalog },
  );

const lintConfigName = cliArgs.lintName;

const oxlintCommand = !oxlint ? "oxlint -c ../../.oxlintrc.json && " : "";
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
};

await writeAllTemplates({
  ctx: templatesCtx,
  templatesDir: join(templatesDir, "monorepo_root"),
  targetDir: installPath,
});

if (oxlint) {
  await genOxlintConfigCli([
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
  await mkdir(targetDir, { recursive: true });

  await writeAllTemplates({
    ctx: {
      ...templatesCtx,
      lintConfigDeps: await getLintPackageDeps({
        oxlint: !!oxlint,
        catalog: cliArgs.catalog,
      }),
    },
    targetDir,
    templatesDir: lintPkgTemplatesDir,
  });

  await genEslintConfigCli([
    "-d",
    targetDir,
    "--kind",
    lintConfig,
  ]);
}

if (hookActions.length) {
  await writeAllTemplates({
    templatesDir: join(templatesDir, "git_hooks"),
    targetDir: join(installPath, ".husky"),
    ctx: templatesCtx,
  });
}

const installDeps = cliArgs.install ?? await confirm({
  message: `Do you want to run '${pkgManager} install'?`,
  initialValue: false,
});

if (installDeps) {
  spawnSync(`${pkgManager} install`, {
    shell: true,
    stdio: "inherit",
    cwd: installPath,
  });
}

const gitInit = cliArgs.git ?? await confirm({
  message: "Do you want to start a new git repo?",
  initialValue: true,
});

if (gitInit) {
  spawnSync("git init", {
    shell: true,
    stdio: "inherit",
    cwd: installPath,
  });
  if (hookActions.length && installDeps) {
    spawnSync("pnpm exec husky", {
      shell: true,
      stdio: "inherit",
      cwd: installPath,
    });
  }
}

outro(
  `Operation completed! 🚀`,
);
