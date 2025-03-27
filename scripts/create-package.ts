import { confirm, input, select } from "@inquirer/prompts";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { title } from "radashi";
import packageJSON from "../package.json" with { type: "json" };

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
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        default: "./dist/index.js",
      },
    },
    devDependencies: {
      [`@${projectName}/eslint-prettier-config`]: "workspace:*",
      "@eslint/config-inspector": "latest",
      "@eslint/js": "latest",
      "@types/node": "latest",
      eslint: "^9.23.0",
      "eslint-config-prettier": "latest",
      globals: "latest",
      prettier: "latest",
      "typescript-eslint": "latest",
      typescript: "^5.8.2",
    },
  };

  fs.writeFileSync(path.join(packageDir, "package.json"), JSON.stringify(packageJson, null, 2));

  const tsconfig = { extends: "../../tsconfig.options.json", compilerOptions: { outDir: "dist", rootDir: "src" } };

  fs.writeFileSync(path.join(packageDir, "tsconfig.json"), JSON.stringify(tsconfig));

  const eslintConfig = `import {eslintConfig} from '@${projectName}/eslint-prettier-config' \n export default eslintConfig`;

  fs.writeFileSync(path.join(packageDir, "eslint.config.js"), eslintConfig);

  const prettierConfig = `import {prettierConfig} from '@${projectName}/eslint-prettier-config' \n export default prettierConfig`;

  fs.writeFileSync(path.join(packageDir, "prettier.config.js"), prettierConfig);

  fs.mkdirSync(path.join(packageDir, "src"));
  fs.writeFileSync(path.join(packageDir, "src/main.ts"), "");

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
