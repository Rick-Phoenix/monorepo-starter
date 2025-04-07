import { exec, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
// eslint-disable no-console
import { cancel, confirm, group, intro, outro, text } from "@clack/prompts";
import { tryThrow, tryThrowPipeline, tryThrowSync } from "@monorepo-starter/utils";
import dedent from "dedent";
import type { PackageJson } from "type-fest";
const execAsync = promisify(exec);

// Section - Constants

const packagesWithPinnedVersions = {
  devDependencies: {
    husky: "^9.1.7",
  },
};

const bunVer = "bun@1.2.8";

intro("✨ Monorepo Initialization ✨");

try {
  // Block - User Inputs

  const inputs = await group(
    {
      projectName: () =>
        text({
          message: "Enter the project's name:",
          defaultValue: "playground",
          placeholder: "playground",
        }),
      packageManager: () =>
        text({
          message: "What is the package manager?",
          defaultValue: bunVer,
          placeholder: bunVer,
        }),
      withHusky: () =>
        confirm({
          message: "Do you want to include Husky?",
          initialValue: true,
        }),
      syncAndInstall: () =>
        confirm({
          message: `Do you want to run 'bun install' after initialization?`,
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        cancel("Operation cancelled.");
        process.exit(0);
      },
    }
  );

  const { projectName, syncAndInstall, withHusky, packageManager } = inputs;

  const addInfisicalScan = withHusky
    ? await confirm({
        message: "Do you want to add the infisical scan to the pre-commit hook?",
        initialValue: false,
      })
    : false;

  //!Block

  // Block - File generation

  // Section - Package.json
  const packageJsonRaw = await readFile(path.resolve(import.meta.dirname, "package.json"), "utf-8");
  const packageJsonParsed: PackageJson & {
    "lint-staged": Record<string, string>;
  } = JSON.parse(packageJsonRaw);

  packageJsonParsed.name = projectName;
  packageJsonParsed.scripts!["init-repo"] = undefined;

  if (packageJsonParsed.dependencies && packageJsonParsed.devDependencies) {
    packageJsonParsed.dependencies["@monorepo-starter/utils"] = undefined;
    packageJsonParsed.dependencies[`@${projectName}/utils`] = "workspace:*";
    if (withHusky) {
      packageJsonParsed.devDependencies.husky = packagesWithPinnedVersions.devDependencies.husky;
      packageJsonParsed.devDependencies["lint-staged"] = "latest";
      packageJsonParsed["lint-staged"] = {
        "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,vue,astro,svelte}": "oxlint && eslint",
      };
    }
  }
  packageJsonParsed.packageManager = packageManager;

  // section - eslint config package
  const lintconfigPackageJsonPath = path.resolve(
    import.meta.dirname,
    "packages/linting-config/package.json"
  );

  const lintconfigPackageJsonRaw = await tryThrow(
    readFile(lintconfigPackageJsonPath, "utf-8"),
    "reading the lint-config package.json file"
  );
  const lintconfigPackageJsonParsed: PackageJson = JSON.parse(lintconfigPackageJsonRaw);

  lintconfigPackageJsonParsed.name = `@${projectName}/linting-config`;

  // Section - Utils subpackage
  const utilsPackageJsonPath = path.resolve(import.meta.dirname, "packages/utils/package.json");
  const utilsPackageJsonRaw = await tryThrow(
    readFile(utilsPackageJsonPath, "utf-8"),
    "reading the utils package.json file"
  );
  const utilsPackageJson: PackageJson = JSON.parse(utilsPackageJsonRaw);

  utilsPackageJson.name = `@${projectName}/utils`;
  utilsPackageJson.devDependencies!["@monorepo-starter/linting-config"] = undefined;
  utilsPackageJson.devDependencies![`@${projectName}/linting-config`] = "workspace:*";

  // Section - .code-workspace file
  const vsCodeWorkSpaceSettings = {
    folders: [
      {
        path: ".",
        name: "root",
      },
      {
        path: "packages/linting-config",
        name: "linting-config",
      },
      {
        path: "packages/utils",
        name: "utils",
      },
    ],
    settings: {
      "yaml.schemas": {
        "./.moon/cache/schemas/project.json": ["**/moon.yml"],
        "./.moon/cache/schemas/tasks.json": [".moon/tasks.yml", ".moon/tasks/**/*.yml"],
        "./.moon/cache/schemas/template.json": ["**/template.yml"],
        "./.moon/cache/schemas/toolchain.json": [".moon/toolchain.yml"],
        "./.moon/cache/schemas/workspace.json": [".moon/workspace.yml"],
      },
      "oxc.enable": true,
    },
  };

  // Section - .gitignore
  const gitignore = dedent(`# --- Dependencies ---
    node_modules/

    # --- Build Output ---
    dist/
    out/
    build/
    *.js.map
    *.d.ts 
    *.tsbuildInfo

    # --- Logs ---
    # Log files generated during runtime or debugging
    logs/
    *.log
    npm-debug.log*
    yarn-debug.log*
    yarn-error.log*
    pnpm-debug.log*

    # --- Environment Variables ---
    # Files containing sensitive information like API keys, passwords, etc.
    .env
    .env.* # Covers .env.local, .env.development, etc.
    !.env.example # Often useful to commit an example env file

    # --- Operating System Generated Files ---
    .DS_Store
    Thumbs.db
    desktop.ini

    # --- Temporary Files ---
    *.tmp
    *.swp
    *.swo

    # --- Test Reports & Coverage ---
    coverage/
    lcov-report/
    *.lcov
    .nyc_output/`);

  // Section - Pre-commit hook
  const precommitHook = dedent(`${
    addInfisicalScan
      ? `if ! [[ $(command -v infisical) ]]; then
    echo "Infisical binary not found."
    exit 1
  fi

  infisical scan git-changes --staged --verbose`
      : ""
  }
  
  lint-staged
  `);

  //!Block

  // Block - Writing to disk
  await tryThrowPipeline([
    [
      writeFile(lintconfigPackageJsonPath, JSON.stringify(lintconfigPackageJsonParsed, null, 2)),
      "writing the eslint package.json file",
    ],
    [
      writeFile(utilsPackageJsonPath, JSON.stringify(utilsPackageJson, null, 2)),
      "writing the utils package.json file",
    ],
    [
      writeFile(
        path.resolve(import.meta.dirname, "package.json"),
        JSON.stringify(packageJsonParsed, null, 2)
      ),
      "writing the root package.json file",
    ],
    [
      writeFile(
        path.resolve(import.meta.dirname, `${projectName}.code-workspace`),
        JSON.stringify(vsCodeWorkSpaceSettings, null, 2)
      ),
      "writing the .code-workspace file",
    ],
    [
      writeFile(path.resolve(import.meta.dirname, ".gitignore"), gitignore),
      "writing the .gitignore file",
    ],
    [mkdir(path.resolve(import.meta.dirname, "apps")), "writing the apps folder"],
    [
      rm(path.resolve(import.meta.dirname, ".git"), { recursive: true }),
      "removing the previous .git folder",
    ],
    [
      execAsync("git init && git add . && git commit -m 'Initial Commit' "),
      "initializing the new git repo",
    ],
  ] as const);
  //!Block

  // Block - Post install scripts
  if (syncAndInstall) {
    const { error } = spawnSync("bun install", {
      stdio: "inherit",
      shell: true,
    });
    if (error) console.warn(`Error with bun install:\n${error}`);
  }

  if (withHusky) {
    const huskyDir = path.resolve(import.meta.dirname, ".husky");
    tryThrowSync(() => mkdirSync(huskyDir, { recursive: true }), "creating the .husky folder");
    await tryThrowPipeline([
      [
        writeFile(path.resolve(huskyDir, "pre-commit"), precommitHook, "utf-8"),
        "writing the pre-commit hook",
      ],
      [execAsync("bun husky"), "initializing husky"],
    ] as const);
  }

  //!Block

  outro(
    `Project successfully initiated. ✅ ${
      addInfisicalScan
        ? "\nRemember to launch 'infisical init' to complete the infisical setup."
        : ""
    }`
  );
  process.exit(0);
} catch (error) {
  console.log("Error while initializing the project:");
  console.error(error);
  process.exit(1);
}
