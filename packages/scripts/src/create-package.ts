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
import { tryThrowSync } from "@monorepo-starter/utils";
import { type } from "arktype";
import dedent from "dedent";
import { findUpSync } from "find-up";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { title } from "radashi";
import { readPackageSync } from "read-pkg";
import { writeJsonFileSync } from "write-json-file";
import {
  optionalPackages,
  type Package,
  pinnedVerPackages,
} from "./constants/packages.js";

process.on("SIGINT", () => {
  console.warn("\nPackage initialization aborted.");
  process.exit(0);
});

const curdir = import.meta.dirname;

const string = type("string");

const monorepoRoot = string.assert(
  tryThrowSync(() =>
    findUpSync(["pmpm-workspace.yaml"], {
      type: "directory",
      cwd: curdir,
    }), "Getting the path to the monorepo root"),
);

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

  const packageDir = resolve(`./${packageType}s`, packageName);
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

  const packageJsonContent = {
    name: `@${projectName}/${packageName}`,
    type: "module",
    private: true,
    author: "Rick-Phoenix",
    description: packageDescription,
    files: ["dist"],
    main: "./dist/index.js", // Fallback for older Node/tools
    types: "./dist/index.d.ts",
    scripts: {
      lint: "oxlint && eslint",
    },
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        default: "./dist/index.js",
      },
    },
    dependencies: {
      ...Object.fromEntries(selectedPackages.dependencies.entries()),
      "@monorepo-starter/utils": "workspace:*",
    },
    devDependencies: {
      [`@${projectName}/linting-config`]: "workspace:*",
      "@eslint/config-inspector": "latest",
      ...pinnedVerPackages,
      "@types/node": "latest",
      ...Object.fromEntries(selectedPackages.devDependencies.entries()),
    },
  };

  // Section - Ts Config
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

  const indexFileContent = additionalPackages.includes("hono")
    ? dedent(
      `import { arktypeValidator } from "@hono/arktype-validator";
        import { type } from "arktype";
        import { Hono } from "hono";
  
        const schema = type({
          name: "string",
          age: "number",
        });
  
        const app = new Hono();
  
        app.post("/author", arktypeValidator("json", schema), (c) => {
          const data = c.req.valid("json");
          return c.json({
            success: true,
          });
        });
  
        export default app`,
    )
    : "";

  const envParsingModule = withEnvSchema
    ? dedent(`// eslint-disable no-console
          /* eslint-disable node/no-process-env */
          import { type } from "arktype";
    
          const envSchema = type({
            "+": "delete",
          });
    
          const env = envSchema(process.env);
    
          if (env instanceof type.errors) {
            console.log("❌ Error while parsing envs: ❌");
            console.log(env.flatProblemsByPath);
            process.exit(1);
          }
    
          export { env };`)
    : "";

  await mkdir(packageDir);
  writeJsonFileSync(resolve(packageDir, "package.json"), packageJsonContent);

  writeJsonFileSync(
    resolve(packageDir, "tsconfig.json"),
    tsconfig,
  );

  await writeFile(resolve(packageDir, "eslint.config.js"), eslintConfig);

  await mkdir(resolve(packageDir, "src"));

  if (indexFileContent.length) {
    await writeFile(resolve(packageDir, "src/index.ts"), indexFileContent);
  }

  if (withEnvSchema) {
    await mkdir(resolve(packageDir, "src/lib"));
    await writeFile(resolve(packageDir, "src/lib/env.ts"), envParsingModule, {
      flag: "a",
    });
  }

  if (syncAndInstall) {
    const { error } = spawnSync("pnpm install && bun moon sync projects", {
      stdio: "inherit",
      shell: true,
    });
    if (error) console.warn(`Error while installing the package: ${error}`);
  }

  outro(
    `${
      title(packageType)
    } '${packageName}' has been successfully initiated. 🚀✅`,
  );
  process.exit(0);
}

await initializePackage();
