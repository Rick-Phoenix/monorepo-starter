// eslint-disable no-useless-spread
// eslint-disable no-console
import {
  cancel,
  confirm,
  intro,
  multiselect,
  outro,
  select,
  text,
} from "@clack/prompts";
import { type } from "arktype";
import { findUpSync } from "find-up";
import { spawnSync } from "node:child_process";
import fs, { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { render } from "nunjucks";
import { title } from "radashi";
import { readPackageSync } from "read-pkg";
import { writeJsonFileSync } from "write-json-file";
import { optionalPackages, type Package } from "./constants/packages.js";

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

  // Section - Package name and type
  const packageType = (await select({
    message: "Do you want to create an app or a package?",
    options: [
      { label: "App 🚀", value: "app" },
      { label: "Package 📦", value: "package" },
    ],
    initialValue: "package",
  })) as string;

  const packageName = (await text({
    message: `Enter the ${packageType}'s name:`,
    validate: (input) => {
      if (!input || !input.length) {
        cancel("The package name cannot be empty.");
        process.exit(1);
      }

      if (input.match(/[,./\\:]/)) {
        cancel(`The name contains invalid characters.`);
        process.exit(1);
      }
      return undefined;
    },
  })) as string;

  const packageDir = resolve(monorepoRoot, `/${packageType}s`, packageName);
  if (fs.existsSync(packageDir)) {
    console.error("This folder already exists.");
    process.exit(1);
  }

  const packageDescription = await text({
    message: `Enter the ${packageType}'s description:`,
    defaultValue: "",
    placeholder: "",
  });

  // Section - Adding additional packages
  const additionalPackages = (await multiselect({
    message:
      "Do you want to install additional packages? (Select with spacebar)",
    options: [
      { label: "Hono", value: "hono" },
      { label: "Arktype", value: "arktype" },
      { label: "Drizzle", value: "drizzle-orm" },
    ],
    required: false,
  })) as string[];

  const withEnvSchema = await confirm({
    message: "Do you want to include an env parsing module?",
    initialValue: false,
  });

  if (withEnvSchema) additionalPackages.push("arktype");

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

  const packageJson = render(resolve(templatesDir, "package.json.j2"), {
    projectName,
    packageName,
    packageDescription,
    dependencies: selectedPackages.dependencies,
    devDependencies: selectedPackages.devDependencies,
  });

  const tsconfig = {
    extends: "../../tsconfig.options.json",
    compilerOptions: {
      outDir: "dist",
      rootDir: "src",
      tsBuildInfoFile: "dist/.tsbuildinfo",
      ...(packageType === "app" && { noEmit: true, composite: false }),
    },
  };

  const eslintConfig =
    `import { createEslintConfig } from '@${projectName}/linting-config' \n export default createEslintConfig()`;

  await mkdir(packageDir);
  writeJsonFileSync(resolve(packageDir, "package.json"), packageJson);

  writeJsonFileSync(
    resolve(packageDir, "tsconfig.json"),
    tsconfig,
  );

  await writeFile(resolve(packageDir, "eslint.config.js"), eslintConfig);

  await mkdir(resolve(packageDir, "src"));

  if (selectedPackages.dependencies.has("hono")) {
    const indexFileContent = readFileSync(
      resolve(templatesDir, "hono_index.ts.j2"),
      "utf8",
    );
    await writeFile(resolve(packageDir, "src/index.ts"), indexFileContent);
  }

  if (withEnvSchema) {
    await mkdir(resolve(packageDir, "src/lib"));
    const envParsingModule = readFileSync(
      resolve(templatesDir, "env_parsing.ts.j2"),
      "utf8",
    );
    await writeFile(resolve(packageDir, "src/lib/env.ts"), envParsingModule, {
      flag: "a",
    });
  }

  if (syncAndInstall) {
    const { error } = spawnSync("pnpm install && bun moon sync projects", {
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
    `${
      title(packageType)
    } '${packageName}' has been successfully initiated. 🚀✅`,
  );
  process.exit(0);
}

await initializePackage();
