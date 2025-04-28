import { mkdirSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { writeJsonFile } from "write-json-file";
// eslint-disable no-console
import { cancel, confirm, group, intro, outro, text } from "@clack/prompts";
import { tryThrowPipeline, tryThrowSync } from "@monorepo-starter/utils";
import { type } from "arktype";
import dedent from "dedent";
import { findUpSync } from "find-up";
import { resolve } from "node:path";
import { type PackageJson, readPackageSync } from "read-pkg";

import { exec, spawnSync } from "node:child_process";
const execAsync = promisify(exec);

const curdir = import.meta.dirname;

const string = type("string");

const monorepoRoot = string.assert(
  tryThrowSync(() =>
    findUpSync(["pmpm-workspace.yaml"], {
      type: "directory",
      cwd: curdir,
    }), "Getting the path to the monorepo root"),
);

intro("✨ Monorepo Initialization ✨");

try {
  const inputs = await group(
    {
      projectName: () =>
        text({
          message: "Enter the project's name:",
          defaultValue: "playground",
          placeholder: "playground",
        }),
      withHusky: () =>
        confirm({
          message: "Do you want to include Husky?",
          initialValue: true,
        }),
      syncAndInstall: () =>
        confirm({
          message: `Do you want to run 'pnpm install' after initialization?`,
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        cancel("Operation cancelled.");
        process.exit(0);
      },
    },
  );

  const { projectName, syncAndInstall, withHusky } = inputs;

  const addInfisicalScan = withHusky
    ? await confirm({
      message: "Do you want to add the infisical scan to the pre-commit hook?",
      initialValue: false,
    })
    : false;

  const rootPackageJson = readPackageSync({
    cwd: monorepoRoot,
  });

  rootPackageJson.name = projectName;

  delete rootPackageJson.scripts!["init-repo"];

  if (rootPackageJson.dependencies && rootPackageJson.devDependencies) {
    delete rootPackageJson.dependencies["@monorepo-starter/utils"];
    rootPackageJson.dependencies[`@${projectName}/utils`] = "workspace:*";
    if (withHusky) {
      rootPackageJson.devDependencies.husky = "^9.0.0";
      rootPackageJson.devDependencies["lint-staged"] = "latest";
      rootPackageJson["lint-staged"] = {
        "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,vue,astro,svelte}":
          "oxlint && eslint",
      };
    }
  }

  const lintConfigPackageName = "linting-config";
  const lintConfigPackageDir = resolve(
    monorepoRoot,
    "packages",
    lintConfigPackageName,
  );
  const lintPackageJson = readPackageSync({
    cwd: lintConfigPackageDir,
  });

  lintPackageJson.name = `@${projectName}/${lintConfigPackageName}`;

  const utilsPackageDir = resolve(monorepoRoot, "packages/utils");
  const utilsPackageJson: PackageJson = readPackageSync({
    cwd: utilsPackageDir,
  });

  utilsPackageJson.name = `@${projectName}/utils`;
  utilsPackageJson
    .devDependencies![`@monorepo-starter/${lintConfigPackageName}`] = undefined;
  utilsPackageJson
    .devDependencies![`@${projectName}/${lintConfigPackageName}`] =
      "workspace:*";

  // To move to a tera template
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

  const precommitHook = dedent(
    `${
      addInfisicalScan
        ? `if ! [[ $(command -v infisical) ]]; then
    echo "Infisical binary not found."
    exit 1
  fi

  infisical scan git-changes --staged --verbose`
        : ""
    }
  
  lint-staged
  `,
  );

  //!Block

  // Block - Writing to disk
  await tryThrowPipeline(
    [
      [
        writeJsonFile(
          resolve(lintConfigPackageDir, "package.json"),
          lintPackageJson,
        ),
        "writing the eslint package.json file",
      ],
      [
        writeJsonFile(
          resolve(utilsPackageDir, "package.json"),
          utilsPackageJson,
        ),
        "writing the utils package.json file",
      ],
      [
        writeJsonFile(resolve(monorepoRoot, "package.json"), rootPackageJson),
        "writing the root package.json file",
      ],
      [
        writeFile(resolve(monorepoRoot, ".gitignore"), gitignore),
        "writing the .gitignore file",
      ],
      [
        mkdir(resolve(monorepoRoot, "apps")),
        "writing the apps folder",
      ],
      [
        rm(resolve(monorepoRoot, ".git"), { recursive: true }),
        "removing the previous .git folder",
      ],
      [
        execAsync("git init && git add . && git commit -m 'Initial Commit' "),
        "initializing the new git repo",
      ],
    ] as const,
  );

  // Test moon sync again
  if (syncAndInstall) {
    const { error } = spawnSync("pnpm install", {
      stdio: "inherit",
      shell: true,
    });
    if (error) console.warn(`Error with pnpm install:\n${error}`);
  }

  if (withHusky) {
    const huskyDir = resolve(monorepoRoot, ".husky");
    tryThrowSync(
      () => mkdirSync(huskyDir, { recursive: true }),
      "creating the .husky folder",
    );
    await tryThrowPipeline(
      [
        [
          writeFile(
            resolve(huskyDir, "pre-commit"),
            precommitHook,
            "utf-8",
          ),
          "writing the pre-commit hook",
        ],
        [execAsync("bun husky"), "initializing husky"],
      ] as const,
    );
  }

  outro(
    `Project successfully initiated. ✅ ${
      addInfisicalScan
        ? "\nRemember to launch 'infisical init' to complete the infisical setup."
        : ""
    }`,
  );
  process.exit(0);
} catch (error) {
  console.log("Error while initializing the project:");
  console.error(error);
  process.exit(1);
}
