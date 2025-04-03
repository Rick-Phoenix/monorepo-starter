// eslint-disable no-useless-spread
// eslint-disable no-console
import { cancel, confirm, intro, multiselect, outro, select, text } from "@clack/prompts";
import dedent from "dedent";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { title } from "radashi";
import packageJSON from "../package.json" with { type: "json" };
import { updateWorkspace } from "./update-workspace";

// Section - Exit Handling
process.on("SIGINT", () => {
  console.warn("\nPackage initialization aborted.");
  process.exit(0);
});

// Section - Types
type Package = {
  name: string;
  subdependencies?: Package[];
  version: string;
  isDev?: boolean;
};

// Block - Constants

// Section - Project name
const projectName = packageJSON.name;
if (!projectName.length)
  throw new Error("Could not find the project name. Is package.json set up correctly?");

// Section - Packages with pinned version
const pinnedVerPackages = {
  eslint: "^9.23.0",
  typescript: "^5.8.2",
  oxlint: "^0.16.3",
};

// Section - Optional packages list
const optionalPackages: Package[] = [
  {
    name: "drizzle-orm",
    version: "^0.41.0",
    subdependencies: [
      { name: "drizzle-arktype", version: "^0.1.2" },
      {
        name: "drizzle-kit",
        version: "^0.30.6",
        isDev: true,
        subdependencies: [{ name: "arktype", version: "^2.1.15" }],
      },
    ],
  },
  { name: "arktype", version: "^2.1.15" },
  {
    name: "hono",
    version: "^4.7.5",
    subdependencies: [
      {
        name: "@hono/arktype-validator",
        version: "^2.0.0",
      },
      { name: "arktype", version: "^2.1.15" },
    ],
  },
];

// !Block

// Block -- Input Start

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

  const packageDir = path.resolve(`./${packageType}s`, packageName);
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
    message: "Do you want to install additional packages? (Select with spacebar)",
    options: [
      { label: "Hono", value: "hono" },
      { label: "Arktype", value: "arktype" },
      { label: "Drizzle", value: "drizzle-orm" },
    ],
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

  // Section - Bun install
  const syncAndInstall = await confirm({
    message: `Do you want to run 'bun install' and 'moon sync projects'?`,
    initialValue: true,
  });

  //!Block

  // Block - File Generation

  // Section - Package.json
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
      "@eslint/js": "latest",
      "@types/node": "latest",
      globals: "latest",
      prettier: "latest",
      //"typescript-eslint": "latest",
      //"eslint-config-prettier": "latest",
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

  // Section - Eslint Config
  const eslintConfig = `import { createEslintConfig } from '@${projectName}/linting-config' \n export default createEslintConfig()`;

  // Section - Prettier Config
  const prettierConfig = `import {prettierConfig} from '@${projectName}/linting-config' \n export default prettierConfig`;

  // Section - Index File Content
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
  
        export default app`
      )
    : "";

  // Section - Env Parsing Module
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

  //!Block

  // Block -- Writing to disk

  await mkdir(packageDir);
  await writeFile(
    path.join(packageDir, "package.json"),
    JSON.stringify(packageJsonContent, null, 2)
  );

  await writeFile(path.join(packageDir, "tsconfig.json"), JSON.stringify(tsconfig));

  await writeFile(path.join(packageDir, "eslint.config.js"), eslintConfig);

  await writeFile(path.join(packageDir, "prettier.config.js"), prettierConfig);

  await mkdir(path.join(packageDir, "src"));

  await writeFile(path.join(packageDir, "src/index.ts"), indexFileContent);

  if (withEnvSchema) {
    await mkdir(path.join(packageDir, "src/lib"));
    await writeFile(path.join(packageDir, "src/lib/env.ts"), envParsingModule, { flag: "a" });
  }

  // !Block

  // Block - Post Install Scripts

  if (syncAndInstall) {
    const { error } = spawnSync("bun install && bun moon sync projects", {
      stdio: "inherit",
      shell: true,
    });
    if (error) console.warn(`Error while installing the package: ${error}`);
  }

  await updateWorkspace(
    path.resolve(import.meta.dirname, `../${projectName}.code-workspace`),
    `${packageType}s/${packageName}`
  );

  //!Block

  outro(`${title(packageType)} '${packageName}' has been successfully initiated. 🚀✅`);
  process.exit(0);
}

await initializePackage();
