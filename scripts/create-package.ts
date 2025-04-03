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
await writeFile(path.join(packageDir, "package.json"), JSON.stringify(packageJsonContent, null, 2));

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

async function scaffoldSvelte() {
  const svelteTsConfig = {
    extends: "./.svelte-kit/tsconfig.json",
    compilerOptions: {
      moduleResolution: "bundler",
      module: "ESNext",
    },
  };

  const viteConfig = dedent(
    `import tailwindcss from '@tailwindcss/vite';
  import { sveltekit } from '@sveltejs/kit/vite';
  import { defineConfig } from 'vite';

  export default defineConfig({
    plugins: [tailwindcss(), sveltekit()]
  });`
  );

  const svelteConfig = dedent(
    `import adapter from '@sveltejs/adapter-static';
  import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

  const config = {
    preprocess: vitePreprocess(),
    kit: { adapter: adapter() }
  };

  export default config;
  `
  );

  const sveltePackageJSON = {
    name: `${packageName}`,
    private: true,
    version: "0.0.1",
    type: "module",
    scripts: {
      dev: "vite dev",
      build: "vite build",
      preview: "vite preview",
      prepare: "svelte-kit sync || echo ''",
      check: "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
      "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    },
    dependencies: {
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
      "@sveltejs/adapter-static": "^3.0.8",
      "@sveltejs/kit": "^2.16.0",
      "@sveltejs/vite-plugin-svelte": "^5.0.0",
      "@tailwindcss/typography": "^0.5.15",
      "@tailwindcss/vite": "^4.0.0",
      svelte: "^5.0.0",
      "svelte-check": "^4.0.0",
      tailwindcss: "^4.0.0",
      vite: "^6.0.0",
    },
  };

  const gitignore = dedent(
    `node_modules

  # Output
  .output
  .vercel
  .netlify
  .wrangler
  /.svelte-kit
  /build

  # OS
  .DS_Store
  Thumbs.db

  # Env
  .env
  .env.*
  !.env.example
  !.env.test

  # Vite
  vite.config.js.timestamp-*
  vite.config.ts.timestamp-*`
  );

  // Section - src/app.html
  const apphtml = dedent(
    `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <link rel="icon" href="%sveltekit.assets%/favicon.png" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      %sveltekit.head%
    </head>
    <body data-sveltekit-preload-data="hover">
      <div style="display: contents">%sveltekit.body%</div>
    </body>
  </html>`
  );

  // Section - src/app.d.ts
  const appdts = dedent(
    `// See https://svelte.dev/docs/kit/types#app.d.ts
  // for information about these interfaces
  declare global {
    namespace App {
      // interface Error {}
      // interface Locals {}
      // interface PageData {}
      // interface PageState {}
      // interface Platform {}
    }
  }

  export {};
  `
  );

  // Section - src/routes/+layout.svelte
  const layoutsvelte = dedent(
    `<script lang="ts">
  import '../styles/index.css';
    
  </script>`
  );

  // Section - src/routes/+page.svelte
  const pagesvelte = dedent(`<h1>Welcome to SvelteKit</h1>`);

  const appdir = path.resolve(import.meta.dirname, `../apps/${packageName}`);
  await mkdir(path.resolve(appdir, "static"), { recursive: true });
  await mkdir(path.resolve(appdir, "src/lib"), { recursive: true });
  await mkdir(path.resolve(appdir, "src/routes"));
  await mkdir(path.resolve(appdir, "src/styles"));

  await writeFile(`${appdir}/package.json`, JSON.stringify(sveltePackageJSON, null, 2), "utf8");
  await writeFile(`${appdir}/vite.config.ts`, viteConfig, "utf8");
  await writeFile(`${appdir}/svelte.config.js`, svelteConfig, "utf8");
  await writeFile(`${appdir}/tsconfig.json`, JSON.stringify(svelteTsConfig, null, 2), "utf8");
  await writeFile(`${appdir}/.gitignore`, gitignore, "utf8");

  await writeFile(`${appdir}/src/app.html`, apphtml, "utf8");
  await writeFile(`${appdir}/src/app.d.ts`, appdts, "utf8");

  await writeFile(`${appdir}/src/routes/+layout.svelte`, layoutsvelte, "utf8");
  await writeFile(`${appdir}/src/routes/+page.svelte`, pagesvelte, "utf8");

  spawnSync(
    `curl -L https://raw.githubusercontent.com/Rick-Phoenix/tailwing-config/main/tailwind.css -o ${appdir}/src/styles `,
    { shell: true }
  );
}
