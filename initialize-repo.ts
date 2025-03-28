import { confirm, input } from "@inquirer/prompts";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

try {
  const projectName = await input({ message: "Enter the project's name:", required: true });
  const packageManager = await input({ message: "What is the package manager?", required: true, default: "bun@1.2.7" });

  const packageJSON = {
    name: projectName,
    version: "1.0.0",
    type: "module",
    private: true,
    workspaces: ["packages/*", "apps/*"],
    scripts: {
      newpackage: "bun ./scripts/create-package.ts",
      prepare: "husky",
    },
    dependencies: {
      "@types/bun": "latest",
      "@types/node": "latest",
    },
    devDependencies: {
      "@inquirer/prompts": "latest",
      "@moonrepo/cli": "^1.33.3",
      radashi: "latest",
      typescript: "^5.8.2",
    },
    trustedDependencies: ["@moonrepo/cli", "esbuild"],
    packageManager: packageManager,
  };

  fs.writeFileSync(path.resolve(import.meta.dirname, "./package.json"), JSON.stringify(packageJSON));

  const eslintPackageJsonContent = {
    name: `@${projectName}/eslint-prettier-config`,
    version: "1.0.0",
    type: "module",
    private: true,
    main: "./index.js",
    types: "./index.d.ts",
    exports: {
      ".": {
        types: "./index.d.ts",
        default: "./index.js",
      },
    },
    devDependencies: {
      "@eslint/config-inspector": "latest",
      "@eslint/js": "latest",
      "@types/node": "latest",
      eslint: "^9.23.0",
      "eslint-config-prettier": "latest",
      globals: "latest",
      prettier: "latest",
      "typescript-eslint": "latest",
    },
  };

  const eslintPackageJson = path.resolve(import.meta.dirname, "packages/eslint-prettier-config/package.json");
  fs.writeFileSync(eslintPackageJson, JSON.stringify(eslintPackageJsonContent));

  const vsCodeWorkSpaceSettings = {
    folders: [
      {
        path: ".",
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
    },
  };

  fs.writeFileSync(
    path.resolve(import.meta.dirname, `${projectName}.code-workspace`),
    JSON.stringify(vsCodeWorkSpaceSettings)
  );

  const gitignore = `# --- Dependencies ---
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
.nyc_output/`;

  fs.writeFileSync(path.resolve(import.meta.dirname, ".gitignore"), gitignore);
  fs.mkdirSync(path.resolve(import.meta.dirname, "apps"));

  const syncAndInstall = await confirm({
    message: `Do you want to run 'bun install' and 'moon sync projects'?`,
    default: true,
  });

  if (syncAndInstall) {
    const { error } = spawnSync("bun install && bun moon sync projects", { stdio: "inherit", shell: true });
    if (error) console.warn(`Error with bun install or moon sync command:\n${error}`);
  }

  console.log(`Project successfully initiated. ✅`);
  console.log(`Run the following to start a new git repo:\nrm -ri .git\ngit init`);
  process.exit(0);
} catch (error) {
  console.log(`Error while initializing the project:`);
  console.error(error);
  process.exit(1);
}
