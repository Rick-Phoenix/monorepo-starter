// eslint-disable no-console
import {
  cancel,
  confirm,
  intro,
  multiselect,
  outro,
  text,
} from "@clack/prompts";
import {
  checkDirectoryStatus,
  getUnsafePathChar,
  isValidPathComponent,
  maybeArrayIncludes,
  tryThrow,
} from "@monorepo-starter/utils";
import { mkdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { localDirs } from "./constants/paths.js";
import { writeRendersInDir } from "./lib/rendering.js";

const res = resolve;

// Hardcoded for now
const pkgManager = "pnpm";

// Have to use this as SIGINT is not reliable in WSL
let positiveExitStatus = false;

intro("✨ Monorepo Initialization ✨");

process.on("exit", (code) => {
  if (code !== 0) {
    cancel("Operation aborted due to an error.");
  } else if (!positiveExitStatus) {
    cancel("Operation cancelled by the user.");
  }
});

const projectName = await text({
  message: "Enter the project's name:",
  defaultValue: "playground",
  placeholder: "playground",
}) as string;

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
}) as string;

const installPath = res(process.cwd(), chosenLocation);
const dirStat = await checkDirectoryStatus(installPath);

if (dirStat.error) {
  console.error(
    `An error occurred while creating the files at the destination:\n${dirStat.error}`,
  );
  process.exit(1);
}

if (dirStat.exists) {
  if (!dirStat.isDirectory) {
    console.error("The target path already exists and is not a directory.");
    process.exit(1);
  } else if (!dirStat.isEmpty) {
    console.error(
      "The target path already exists and is not an empty directory.",
    );
    process.exit(1);
  }
} else {
  await tryThrow(mkdir(installPath), "creating the destination directory");
}

const rootPackages = await multiselect({
  message: "Select packages to add to your workspace root (optional):",
  options: [{
    value: "@infisical/cli",
    label: "Infisical [secrets management] (requires an account)",
  }, { label: "Husky [git hooks]", value: "husky" }],
  initialValues: ["husky"],
}) as string[];

const addGitHook = rootPackages.includes("husky")
  ? await confirm({
    message: "Do you want to create a pre-commit hook for husky?",
    initialValue: true,
  })
  : false;

const hookOptions = [{
  value: "lint-staged",
  label: "Lint-staged",
  hint: "lint-staged will be added as a dependency for internal packages",
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
  })
  : undefined;

const workspacePackages = await multiselect({
  message: "Select additional workspace packages (optional):",
  options: [{
    label: "Eslint Configuration Package (uses antfu's eslint-config)",
    value: "linting-config",
  }, {
    label: "Scripts Package (pre-equipped with some basic scripts)",
    value: "scripts",
  }],
  initialValues: ["scripts", "linting-config"],
}) as string[];

const rootDirs = {
  git: join(installPath, ".git"),
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

const templatesDir = localDirs.templates;

const templatesCtx = {
  rootPackages,
  workspacePackages,
  projectName,
  infisical: maybeArrayIncludes(hookActions, "infisical"),
  "lint-staged": maybeArrayIncludes(hookActions, "lint-staged"),
};

await writeRendersInDir({
  ctx: { templatesCtx },
  templatesDir: join(templatesDir, "monorepo_root"),
  targetDir: installPath,
});

if (workspacePackages.includes("linting-config")) {
  const lintPkgTemplatesDir = join(templatesDir, "linting-config");
  const targetDir = join(installPath, "packages", "linting-config");

  await writeRendersInDir({
    ctx: templatesCtx,
    targetDir,
    templatesDir: lintPkgTemplatesDir,
  });
}

if (Array.isArray(hookActions) && hookActions.length) {
  await writeRendersInDir({
    templatesDir: join(templatesDir, "git_hooks"),
    targetDir: join(installPath, ".husky"),
    ctx: templatesCtx,
  });
}

const installPathRelative = relative(process.cwd(), installPath);

positiveExitStatus = true;

outro(
  `All done! To complete the installation, run:\n"cd ${installPathRelative} && ${pkgManager} i"`,
);
