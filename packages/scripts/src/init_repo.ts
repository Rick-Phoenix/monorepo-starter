/* eslint-disable ts/promise-function-async */
import { mkdirSync, readFileSync, rmdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { writeJsonFile } from "write-json-file";
// eslint-disable no-console
import { cancel, confirm, group, intro, outro, text } from "@clack/prompts";
import { tryThrowPipeline, tryThrowSync } from "@monorepo-starter/utils";
import { type } from "arktype";
import { findUpSync } from "find-up";
import { dirname, resolve } from "node:path";
import { type PackageJson, readPackageSync } from "read-pkg";

import { exec, spawnSync } from "node:child_process";
import { render } from "nunjucks";
const execAsync = promisify(exec);

const curdir = import.meta.dirname;

const string = type("string");

const monorepoRoot = dirname(string.assert(
  tryThrowSync(() =>
    findUpSync(["pnpm-workspace.yaml"], {
      type: "file",
      cwd: curdir,
    }), "Getting the path to the monorepo root"),
));

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
      runInstall: () =>
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

  const { projectName, runInstall, withHusky } = inputs;

  const addInfisicalScan = withHusky
    ? await confirm({
      message: "Do you want to add the infisical scan to the pre-commit hook?",
      initialValue: false,
    })
    : false;

  const rootPackageJson = readPackageSync({
    cwd: monorepoRoot,
    normalize: false,
  });

  rootPackageJson.name = projectName;

  if (rootPackageJson.devDependencies) {
    if (withHusky) {
      rootPackageJson.devDependencies.husky = "^9.0.0";
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
    normalize: false,
  });

  lintPackageJson.name = `@${projectName}/${lintConfigPackageName}`;

  const eslintConfig =
    `import { createEslintConfig } from '@${projectName}/${lintConfigPackageName}' 
 export default createEslintConfig()`;

  const utilsPackageDir = resolve(monorepoRoot, "packages/utils");
  const utilsPackageJson: PackageJson = readPackageSync({
    cwd: utilsPackageDir,
    normalize: false,
  });

  utilsPackageJson.name = `@${projectName}/utils`;
  delete utilsPackageJson
    .devDependencies![`@monorepo-starter/${lintConfigPackageName}`];
  utilsPackageJson
    .devDependencies![`@${projectName}/${lintConfigPackageName}`] =
      "workspace:*";

  const scriptsPackageDir = resolve(import.meta.dirname, "..");
  console.log(scriptsPackageDir);
  const scriptsPackageJson = readPackageSync({
    cwd: scriptsPackageDir,
    normalize: false,
  });

  scriptsPackageJson.name = `@${projectName}/scripts`;

  delete scriptsPackageJson
    .devDependencies!["@monorepo-starter/linting-config"];
  delete scriptsPackageJson.dependencies!["@monorepo-starter/utils"];

  scriptsPackageJson.dependencies![`@${projectName}/utils`] = "workspace:*";
  scriptsPackageJson
    .devDependencies![`@${projectName}/${lintConfigPackageName}`] =
      "workspace:*";

  const templatesDir = resolve(import.meta.dirname, "templates");

  const gitignore = readFileSync(
    resolve(templatesDir, ".gitignore.j2"),
    "utf8",
  );

  await tryThrowPipeline(
    [
      [
        writeJsonFile(
          resolve(lintConfigPackageDir, "package.json"),
          lintPackageJson,
        ),
        "writing the linting package package.json file",
      ],
      [
        writeJsonFile(
          resolve(utilsPackageDir, "package.json"),
          utilsPackageJson,
        ),
        "writing the utils package.json file",
      ],
      [
        writeFile(
          resolve(utilsPackageDir, "eslint.config.js"),
          eslintConfig,
        ),
        "writing the utils eslint.config.js file",
      ],
      [
        writeJsonFile(
          resolve(scriptsPackageDir, "package.json"),
          scriptsPackageJson,
        ),
        "writing the scripts package.json file",
      ],
      [
        writeFile(
          resolve(scriptsPackageDir, "eslint.config.js"),
          eslintConfig,
        ),
        "writing the scripts eslint.config.js file",
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
    ] as const,
  );

  tryThrowSync(
    () => rmdirSync(resolve(monorepoRoot, ".git"), { recursive: true }),
    "removing the previous .git folder",
  );

  tryThrowSync(
    () =>
      exec("git init && git add . && git commit -m 'Initial Commit' ", {
        cwd: monorepoRoot,
      }),
    "initializing the new git repo",
  );

  if (runInstall) {
    const { error } = spawnSync("pnpm install", {
      stdio: "inherit",
      shell: true,
    });
    if (error) console.warn(`Error with pnpm install:\n${error}`);
  }

  if (withHusky) {
    const huskyDir = resolve(monorepoRoot, ".husky");
    const preCommitHook = render(
      resolve(templatesDir, "pre_commit_hook.sh.j2"),
      { infisical: addInfisicalScan === true },
    );
    tryThrowSync(
      () => mkdirSync(huskyDir, { recursive: true }),
      "creating the .husky folder",
    );
    await tryThrowPipeline(
      [
        [
          writeFile(
            resolve(huskyDir, "pre-commit"),
            preCommitHook,
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
      addInfisicalScan === true
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
