// eslint-disable no-useless-spread
// eslint-disable no-console
import { confirm, input, select } from "@inquirer/prompts";
import { select as selectMultiple } from "inquirer-select-pro";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { title } from "radashi";
import packageJSON from "../package.json" with { type: "json" };

//TODO - Add ability to add common packages like validators and such

const pinnedVerPackages = {
  eslint: "^9.23.0",
  typescript: "^5.8.2",
  oxlint: "^0.16.3",
};

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
  { name: "hono", version: "^4.7.5" },
];

type Package = {
  name: string;
  subdependencies?: Package[];
  version: string;
  isDev?: boolean;
};

const packageType = await select({
  message: "Do you want to create an app or a package?",
  choices: [
    { name: "App 🚀", value: "app" },
    { name: "Package 📦", value: "package" },
  ],
  default: "package",
});

try {
  const packageName = await input({
    message: `Enter the ${packageType}'s name:`,
    required: true,
  });

  if (packageName.match(/[,./\\:]/)) {
    console.error(`The name contains invalid characters.`);
    process.exit(1);
  }

  const packageDir = path.resolve(`./${packageType}s`, packageName);
  if (fs.existsSync(packageDir)) {
    console.error("This folder already exists.");
    process.exit(1);
  }

  fs.mkdirSync(packageDir);

  const packageDescription = await input({
    message: `Enter the ${packageType}'s description:`,
    default: "",
  });

  const additionalPackages = await selectMultiple({
    message: "Do you want to install additional packages?",
    multiple: true,
    options: [
      { name: "Hono", value: "hono" },
      { name: "Arktype", value: "arktype" },
      { name: "Drizzle", value: "drizzle-orm" },
    ],
  });

  const withEnvSchema = await confirm({ message: "Do you want to include an env parsing module?", default: false });
  if (withEnvSchema) additionalPackages.push("arktype");

  const selectedPackages = {
    dependencies: new Map<string, string>(),
    devDependencies: new Map<string, string>(),
  };

  const addPackage = (pac: Package) => {
    pac.isDev
      ? selectedPackages.devDependencies.set(pac.name, pac.version)
      : selectedPackages.dependencies.set(pac.name, pac.version);
  };

  additionalPackages.forEach((selection) => {
    for (const pack of optionalPackages) {
      if (pack.name === selection) {
        addPackage(pack);
        if (pack.subdependencies) pack.subdependencies.forEach(addPackage);
      }
    }
  });

  const projectName = packageJSON.name;

  const packageJson = {
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
    },
    devDependencies: {
      [`@${projectName}/linting-config`]: "workspace:*",
      "@eslint/config-inspector": "latest",
      "@eslint/js": "latest",
      "@types/node": "latest",
      globals: "latest",
      prettier: "latest",
      //"typescript-eslint": "latest",
      //"eslint-config-prettier": "latest",
      ...pinnedVerPackages,
      ...Object.fromEntries(selectedPackages.devDependencies.entries()),
    },
  };

  fs.writeFileSync(path.join(packageDir, "package.json"), JSON.stringify(packageJson, null, 2));

  const tsconfig = { extends: "../../tsconfig.options.json", compilerOptions: { outDir: "dist", rootDir: "src" } };

  fs.writeFileSync(path.join(packageDir, "tsconfig.json"), JSON.stringify(tsconfig));

  const eslintConfig = `import { createEslintConfig } from '@${projectName}/linting-config' \n export default createEslintConfig()`;

  fs.writeFileSync(path.join(packageDir, "eslint.config.js"), eslintConfig);

  const prettierConfig = `import {prettierConfig} from '@${projectName}/linting-config' \n export default prettierConfig`;

  fs.writeFileSync(path.join(packageDir, "prettier.config.js"), prettierConfig);

  fs.mkdirSync(path.join(packageDir, "src"));
  fs.writeFileSync(path.join(packageDir, "src/index.ts"), "");

  if (withEnvSchema) {
    const envParsingModule = `// eslint-disable no-console
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

export { env };`;
    fs.mkdirSync(path.join(packageDir, "src/lib"));
    fs.writeFileSync(path.join(packageDir, "src/lib/env.ts"), envParsingModule, { flag: "a" });
  }

  const syncAndInstall = await confirm({
    message: `Do you want to run 'bun install' and 'moon sync projects'?`,
    default: true,
  });

  if (syncAndInstall) {
    const { error } = spawnSync("bun install && bun moon sync projects", { stdio: "inherit", shell: true });
    if (error) console.warn(`Error while installing the package: ${error}`);
  }
  console.log(`${title(packageType)} '${packageName}' has been successfully initiated. ✅`);
  process.exit(0);
} catch (error) {
  console.error("Error initializing the package:", error);
  process.exit(1);
}
