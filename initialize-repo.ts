// eslint-disable no-console
import { confirm, input } from "@inquirer/prompts";
import dedent from "dedent";
import { exec, spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
const execAsync = promisify(exec);

const packagesWithPinnedVersions = {
  oxlint: "^0.16.3",
  typescript: "^5.8.2",
  husky: "^9.1.7",
  "@moonrepo/cli": "^1.34.0",
  eslint: "^9.23.0",
};

const bunVer = "bun@1.2.8";

const { eslint, husky, oxlint, typescript } = packagesWithPinnedVersions;

try {
  const projectName = await input({
    message: "Enter the project's name:",
    required: true,
    default: "playground",
  });
  const packageManager = await input({
    message: "What is the package manager?",
    required: true,
    default: bunVer,
  });
  const withHusky = await confirm({ message: "Do you want to include Husky?", default: true });

  const addInfisicalScan = withHusky
    ? await confirm({
        message: "Do you want to add the infisical scan to the pre-commit hook?",
        default: false,
      })
    : false;

  const packageJSON = {
    name: projectName,
    version: "1.0.0",
    type: "module",
    private: true,
    workspaces: ["packages/*", "apps/*"],
    scripts: {
      newpackage: "bun ./scripts/create-package.ts",
    },
    ...(withHusky && {
      "lint-staged": {
        "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,vue,astro,svelte}": "oxlint && eslint",
      },
    }),
    dependencies: {
      "@types/bun": "latest",
      "@types/node": "latest",
      dedent: "^1.5.3",
      "jsonc-parser": "latest",
      "@monorepo-starter/utils": "workspace:*",
    },
    devDependencies: {
      "@inquirer/prompts": "latest",
      "@moonrepo/cli": packagesWithPinnedVersions["@moonrepo/cli"],
      radashi: "latest",
      typescript,
      oxlint,
      ...(withHusky && { husky, "lint-staged": "latest" }),
    },
    trustedDependencies: ["@moonrepo/cli", "esbuild"],
    packageManager: packageManager,
  };

  await writeFile(path.resolve(import.meta.dirname, "./package.json"), JSON.stringify(packageJSON));

  const eslintPackageJsonContent = {
    name: `@${projectName}/linting-config`,
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
      eslint,
      "eslint-config-prettier": "latest",
      globals: "latest",
      prettier: "latest",
      "typescript-eslint": "latest",
      oxlint,
      "eslint-plugin-oxlint": "latest",
    },
  };

  const eslintPackageJson = path.resolve(
    import.meta.dirname,
    "packages/linting-config/package.json"
  );
  await writeFile(eslintPackageJson, JSON.stringify(eslintPackageJsonContent));

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

  await writeFile(
    path.resolve(import.meta.dirname, `${projectName}.code-workspace`),
    JSON.stringify(vsCodeWorkSpaceSettings)
  );

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

  await writeFile(path.resolve(import.meta.dirname, ".gitignore"), gitignore);
  await mkdir(path.resolve(import.meta.dirname, "apps"));

  await rm(path.resolve(import.meta.dirname, ".git"), { recursive: true });
  await execAsync("git init && git add . && git commit -m 'Initial Commit' ");

  const syncAndInstall = await confirm({
    message: `Do you want to run 'bun install'?`,
    default: true,
  });

  if (syncAndInstall) {
    const { error } = spawnSync("bun install", { stdio: "inherit", shell: true });
    if (error) console.warn(`Error with bun install:\n${error}`);
  }

  if (withHusky) {
    await execAsync("bun husky");
    await writeFile(
      path.join(import.meta.dirname, ".husky/pre-commit"),
      dedent(`
        ${
          addInfisicalScan
            ? `if ! [[ $(command -v infisical) ]]; then
          echo "Infisical binary not found."
          exit 1
        fi

        infisical scan git-changes --staged --verbose`
            : ""
        }
        
        lint-staged
        `),
      "utf-8"
    );
  }

  console.log(`Project successfully initiated. ✅`);
  if (addInfisicalScan)
    console.warn("Remember to launch 'infisical init' to complete the infisical setup.");
  process.exit(0);
} catch (error) {
  console.log(`Error while initializing the project:`);
  console.error(error);
  process.exit(1);
}
