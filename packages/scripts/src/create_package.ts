// eslint-disable no-useless-spread
// eslint-disable no-console
import {
  cancel,
  confirm,
  intro,
  multiselect,
  outro,
  text,
} from "@clack/prompts";
import { type } from "arktype";
import { findUpSync } from "find-up";
import { spawnSync } from "node:child_process";
import fs, { readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { readPackageSync } from "read-pkg";
import { optionalPackages, type Package } from "./constants/packages.js";
import { writeRender } from "./lib/rendering.js";

process.on("SIGINT", () => {
  console.warn("\nPackage initialization aborted.");
  process.exit(0);
});

const curdir = import.meta.dirname;

const string = type("string");

const rootMarker = string.assert(findUpSync("pnpm-workspace.yaml", {
  type: "file",
}));

const monorepoRoot = dirname(rootMarker);

const rootPackageJson = readPackageSync({ cwd: monorepoRoot });

const projectName: string = rootPackageJson.name;
if (!projectName.length) {
  throw new Error(
    "Could not find the project name. Is package.json set up correctly?",
  );
}

async function initializePackage() {
  intro("-- Initializing new package --");

  const packageName = (await text({
    message: `Enter the package's name:`,
    validate: (input) => {
      if (!input || !input.length) {
        cancel("The package name cannot be empty.");
        process.exit(1);
      }

      if (input.match(/[,./:\\]/)) {
        cancel(`The name contains invalid characters.`);
        process.exit(1);
      }
      return undefined;
    },
  })) as string;

  const packageDir = resolve(monorepoRoot, `packages`, packageName);
  if (fs.existsSync(packageDir)) {
    console.error("This folder already exists.");
    process.exit(1);
  }

  const packageDescription = await text({
    message: `Enter the package's description:`,
    defaultValue: "",
    placeholder: "",
  });

  // Section - Adding additional packages
  const additionalPackages = (await multiselect({
    message:
      "Do you want to install additional packages? (Select with spacebar)",
    options: [
      { label: "Arktype", value: "arktype" },
      { label: "Drizzle", value: "drizzle-orm" },
    ],
    required: false,
  })) as string[];

  const withEnvSchema = await confirm({
    message: "Do you want to include an env parsing module?",
    initialValue: false,
  });

  if (withEnvSchema === true) {
    additionalPackages.push(...["arktype", "dotenv", "dotenv-expand"]);
  }

  const selectedPackages = {
    dependencies: new Map<string, string>(),
    devDependencies: new Map<string, string>(),
  };

  const addPackage = (pac: Package) => {
    pac.isDev
      ? selectedPackages.devDependencies.set(pac.name, pac.version)
      : selectedPackages.dependencies.set(pac.name, pac.version);
    if (pac.subdependencies) pac.subdependencies.forEach(addPackage);
  };

  additionalPackages.forEach((selection) => {
    for (const pack of optionalPackages) {
      if (pack.name === selection) {
        addPackage(pack);
      }
    }
  });

  const syncAndInstall = await confirm({
    message: `Do you want to run 'pnpm install' and 'moon sync projects'?`,
    initialValue: true,
  });

  const scriptsDir = dirname(string.assert(findUpSync("package.json", {
    cwd: curdir,
    type: "file",
  })));

  const templatesDir = resolve(scriptsDir, "src/templates");

  const lintPkgName = "linting-config";

  const eslintConfig =
    `import { createEslintConfig } from '@${projectName}/${lintPkgName}' \n export default createEslintConfig()`;

  await mkdir(join(packageDir, "src", "lib"), { recursive: true });

  writeRender(
    resolve(templatesDir, "tsconfig.json.j2"),
    resolve(packageDir, "tsconfig.json"),
  );

  writeRender(
    resolve(templatesDir, "package.json.j2"),
    join(packageDir, "package.json"),
    {
      projectName,
      packageName,
      packageDescription,
      lintPkgName,
      dependencies: selectedPackages.dependencies,
      devDependencies: selectedPackages.devDependencies,
    },
  );

  writeFileSync(resolve(packageDir, "eslint.config.js"), eslintConfig);

  if (withEnvSchema) {
    const envParsingModule = readFileSync(
      resolve(templatesDir, "env_parsing.ts.j2"),
      "utf8",
    );
    writeFileSync(resolve(packageDir, "src/lib/env.ts"), envParsingModule, {
      flag: "a",
    });
  }

  if (syncAndInstall) {
    const { error } = spawnSync("pnpm install && moon sync projects", {
      stdio: "inherit",
      shell: true,
    });
    if (error) {
      console.warn(
        `An error occurred with pnpm install or moon sync projects: ${error}`,
      );
    }
  }

  outro(
    `'${packageName}' has been successfully initiated. 🚀✅`,
  );
  process.exit(0);
}

await initializePackage();
