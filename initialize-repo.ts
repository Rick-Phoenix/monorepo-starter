// eslint-disable no-console
import { confirm, intro, outro, text } from "@clack/prompts";
import { tryThrowPipeline } from "@monorepo-starter/utils";
import dedent from "dedent";
import { exec, spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import utilsPackageJSON from "./packages/utils/package.json" with { type: "json" };
const execAsync = promisify(exec);

// Section - Constants

const packagesWithPinnedVersions = {
  devDependencies: {
    oxlint: "^0.16.3",
    typescript: "^5.8.2",
    "@moonrepo/cli": "^1.34.0",
    eslint: "^9.23.0",
    "@clack/prompts": "^0.10.0",
  },
  husky: "^9.1.7",
  dependencies: { dedent: "^1.5.3" },
};

const bunVer = "bun@1.2.8";

const {
  devDependencies: { eslint, oxlint },
} = packagesWithPinnedVersions;

intro("✨ Monorepo Initialization ✨");

try {
  // Block - User Inputs

  // Section - Project name
  const projectName = (await text({
    message: "Enter the project's name:",
    defaultValue: "playground",
    placeholder: "playground",
  })) as string;

  // Section - Package manager
  const packageManager = (await text({
    message: "What is the package manager?",
    defaultValue: bunVer,
    placeholder: bunVer,
  })) as string;

  // Section - Husky
  const withHusky = await confirm({ message: "Do you want to include Husky?", initialValue: true });

  // Section - Infisical
  const addInfisicalScan = withHusky
    ? await confirm({
        message: "Do you want to add the infisical scan to the pre-commit hook?",
        initialValue: false,
      })
    : false;

  // Section - Bun install
  const syncAndInstall = await confirm({
    message: `Do you want to run 'bun install'?`,
    initialValue: true,
  });

  //!Block

  // Block - File generation

  // Section - Package.json
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
      "jsonc-parser": "latest",
      [`@${projectName}/utils`]: "workspace:*",
      ...packagesWithPinnedVersions.dependencies,
    },
    devDependencies: {
      radashi: "latest",
      ...packagesWithPinnedVersions.devDependencies,
      ...(withHusky && { husky: packagesWithPinnedVersions.husky, "lint-staged": "latest" }),
    },
    trustedDependencies: ["@moonrepo/cli", "esbuild"],
    packageManager: packageManager,
  };

  // Section - Eslint config package
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
      "eslint-config-prettier": "latest",
      globals: "latest",
      prettier: "latest",
      "typescript-eslint": "latest",
      "eslint-plugin-oxlint": "latest",
      eslint,
      oxlint,
    },
  };

  const eslintPackageJson = path.resolve(
    import.meta.dirname,
    "packages/linting-config/package.json"
  );

  // Section - Utils subpackage
  const utilsPackageJsonCopy = { ...utilsPackageJSON };
  utilsPackageJsonCopy.name = `@${projectName}/utils`;
  //@ts-expect-error
  utilsPackageJsonCopy.devDependencies["@monorepo-starter/linting-config"] = undefined;
  utilsPackageJsonCopy.devDependencies[`@${projectName}/linting-config`] = "workspace:*";

  // Section - .code-workspace file
  const vsCodeWorkSpaceSettings = {
    folders: [
      {
        path: ".",
        name: "root",
      },
      {
        path: "packages/linting-config",
        name: "linting-config",
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
      "oxc.enable": true,
    },
  };

  // Section - .gitignore
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

  // Section - Pre-commit hook
  const precommitHook = dedent(`${
    addInfisicalScan
      ? `if ! [[ $(command -v infisical) ]]; then
    echo "Infisical binary not found."
    exit 1
  fi

  infisical scan git-changes --staged --verbose`
      : ""
  }
  
  lint-staged
  `);

  //!Block

  // Block - Writing to disk
  await tryThrowPipeline([
    [
      writeFile(eslintPackageJson, JSON.stringify(eslintPackageJsonContent)),
      "writing the eslint package.json file",
    ],
    [
      writeFile(
        path.resolve(import.meta.dirname, "packages/utils/package.json"),
        JSON.stringify(utilsPackageJsonCopy, null, 2)
      ),
      "writing the utils package.json file",
    ],
    [
      writeFile(path.resolve(import.meta.dirname, "./package.json"), JSON.stringify(packageJSON)),
      "writing the root package.json file",
    ],
    [
      writeFile(
        path.resolve(import.meta.dirname, `${projectName}.code-workspace`),
        JSON.stringify(vsCodeWorkSpaceSettings)
      ),
      "writing the .code-workspace file",
    ],
    [
      writeFile(path.resolve(import.meta.dirname, ".gitignore"), gitignore),
      "writing the .gitignore file",
    ],
    [mkdir(path.resolve(import.meta.dirname, "apps")), "writing the apps folder"],
    [
      rm(path.resolve(import.meta.dirname, ".git"), { recursive: true }),
      "removing the previous .git folder",
    ],
    [
      execAsync("git init && git add . && git commit -m 'Initial Commit' "),
      "initializing the new git repo",
    ],
  ] as const);
  //!Block

  // Block - Post install scripts
  if (syncAndInstall) {
    const { error } = spawnSync("bun install", { stdio: "inherit", shell: true });
    if (error) console.warn(`Error with bun install:\n${error}`);
  }

  if (withHusky) {
    await tryThrowPipeline([
      [execAsync("bun husky"), "initializing husky"],
      [
        writeFile(path.join(import.meta.dirname, ".husky/pre-commit"), precommitHook, "utf-8"),
        "writing the pre-commit hook",
      ],
    ] as const);
  }
  //!Block

  outro(
    `Project successfully initiated. ✅ ${addInfisicalScan ? "\nRemember to launch 'infisical init' to complete the infisical setup." : ""}`
  );
  process.exit(0);
} catch (error) {
  console.log(`Error while initializing the project:`);
  console.error(error);
  process.exit(1);
}
