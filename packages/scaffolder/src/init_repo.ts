#!/usr/bin/env node

// eslint-disable no-console
import { cancel, intro, outro } from "@clack/prompts";
import {
  confirm,
  getUnsafePathChar,
  isValidPathComponent,
  maybeArrayIncludes,
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
import { initRepoCli } from "./lib/cli.js";
import { getPackagesWithLatestVersions } from "./lib/packages_list.js";

const res = resolve;

// Hardcoded for now
const pkgManager = "pnpm";

const cliArgs = initRepoCli();

intro("✨ Monorepo Initialization ✨");

const projectName = await text({
  message: "Enter the project's name:",
  defaultValue: "playground",
  placeholder: "playground",
});

const chosenLocation = cliArgs.directory || await text({
  message: "Where do you want to create the new monorepo?",
  defaultValue: projectName,
  placeholder: projectName,
});

if (!isValidPathComponent(chosenLocation)) {
  const unsafeChar = getUnsafePathChar(chosenLocation);
  if (unsafeChar && !(unsafeChar === "/" && chosenLocation.startsWith("/"))) {
    cancel(
      `The following character is not allowed by your system: ${unsafeChar}`,
    );
  }
}

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
  options: [{
    value: "@infisical/cli",
    label: "Infisical [secrets management] (requires an account)",
  }, { label: "Husky [git hooks]", value: "husky" }],
  initialValues: ["husky"],
  required: false,
  cursorAt: "@infisical/cli",
});

const addGitHook = rootPackages.includes("husky")
  ? await confirm({
    message: "Do you want to create a pre-commit hook for husky?",
    initialValue: true,
  })
  : false;

const hookOptions = [{
  value: "lint-staged",
  label: "Lint-staged",
  hint: "Runs linting checks on committed files",
}];

if (rootPackages.includes("@infisical/cli")) {
  hookOptions.push({
    label: "Infisical scan",
    value: "infisical",
    hint: "Runs automatic checks for potential secrets leaks",
  });
}

const hookActions = addGitHook === true
  ? await multiselect({
    message: "What do you want to add to the pre-commit hook?",
    options: hookOptions,
    initialValues: ["lint-staged"],
    cursorAt: "infisical",
  })
  : [];

const workspacePackages: string[] = [];

const lintingPkgChoice = cliArgs.lintConfig || await select({
  message: "Do you want to include a local linting config package?",
  options: [{
    value: "opinionated",
    label: "Yes, with opinionated defaults",
  }, {
    value: "minimal",
    label: "Yes, with no defaults",
  }, {
    value: "none",
    label: "No, thank you",
  }],
  initialValue: "opinionated",
});

const includeLintConfig = lintingPkgChoice !== "none";

const lintConfigName = cliArgs.lintConfigName;

if (includeLintConfig) workspacePackages.push(lintConfigName);

const includeScriptsPkg = cliArgs.scripts ?? await confirm({
  message: "Do you want to add a local scripts package?",
  initialValue: true,
});

if (includeScriptsPkg === true) workspacePackages.push("scripts");

const rootDirs = {
  packages: join(installPath, "packages"),
  ...(addGitHook && { husky: join(installPath, ".husky") }),
};

for (const [name, path] of Object.entries(rootDirs)) {
  await tryThrow(mkdir(path), `creating the directory for ${name} at ${path}`);
}

if (workspacePackages.length) {
  for (const workspacePackage of workspacePackages) {
    const targetDir = join(installPath, "packages", workspacePackage);
    await tryThrow(
      mkdir(targetDir, { recursive: true }),
      `creating the directory for ${workspacePackage} at ${targetDir}`,
    );
  }
}

const templatesDir = join(import.meta.dirname, "templates");

const { dependencies, devDependencies } = await getPackagesWithLatestVersions(
  rootPackages,
);

const templatesCtx = {
  dependencies,
  devDependencies,
  workspacePackages,
  projectName,
  infisical: maybeArrayIncludes(hookActions, "infisical"),
  lintStaged: maybeArrayIncludes(hookActions, "lint-staged"),
  includeLintConfig,
  lintConfigOpinionated: lintingPkgChoice === "opinionated",
  lintConfigName,
};

await writeAllTemplates({
  ctx: templatesCtx,
  templatesDir: join(templatesDir, "monorepo_root"),
  targetDir: installPath,
});

if (includeLintConfig) {
  const lintPkgTemplatesDir = join(templatesDir, "linting-config");
  const targetDir = join(installPath, "packages", lintConfigName);

  await writeAllTemplates({
    ctx: templatesCtx,
    targetDir,
    templatesDir: lintPkgTemplatesDir,
  });
}

if (workspacePackages.includes("scripts")) {
  const scriptsPkgTemplatesDir = join(templatesDir, "scripts");
  const targetDir = join(installPath, "packages", "scripts");

  await writeAllTemplates({
    ctx: templatesCtx,
    targetDir,
    templatesDir: scriptsPkgTemplatesDir,
  });
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
  if (hookActions.length) {
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
