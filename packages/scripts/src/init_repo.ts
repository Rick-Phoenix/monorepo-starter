#!/usr/bin/env node

// eslint-disable no-console
import { intro, outro } from "@clack/prompts";
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
import { mkdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import {
  getPackagesWithLatestVersions,
  type OptionalPackage,
} from "./lib/packages_list.js";

const res = resolve;

// Hardcoded for now
const pkgManager = "pnpm";

intro("✨ Monorepo Initialization ✨");

const projectName = await text({
  message: "Enter the project's name:",
  defaultValue: "playground",
  placeholder: "playground",
});

const chosenLocation = await text({
  message:
    "Where do you want to create the new monorepo? (Path relative to cwd)",
  defaultValue: projectName,
  placeholder: projectName,
  validate(value) {
    if (!isValidPathComponent(value)) {
      const unsafeChar = getUnsafePathChar(value);
      if (!unsafeChar) return `This path is not valid.`;
      return `The following character is not allowed by your system: ${unsafeChar}`;
    }
  },
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
  : undefined;

const workspacePackages: string[] = [];

const lintingPkgChoice = await select({
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

if (includeLintConfig) workspacePackages.push("linting-config");

const includeScriptsPkg = await confirm({
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
  rootPackages as OptionalPackage[],
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
};

await writeAllTemplates({
  ctx: templatesCtx,
  templatesDir: join(templatesDir, "monorepo_root"),
  targetDir: installPath,
});

if (includeLintConfig) {
  const lintPkgTemplatesDir = join(templatesDir, "linting-config");
  const targetDir = join(installPath, "packages", "linting-config");

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

if (Array.isArray(hookActions) && hookActions.length) {
  await writeAllTemplates({
    templatesDir: join(templatesDir, "git_hooks"),
    targetDir: join(installPath, ".husky"),
    ctx: templatesCtx,
  });
}

const installPathRelative = relative(process.cwd(), installPath);

outro(
  `All done! To complete the installation, run:\n"cd ${installPathRelative} && ${pkgManager} i"`,
);
