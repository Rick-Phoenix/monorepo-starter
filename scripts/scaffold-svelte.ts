// eslint-disable no-console
import { cancel, confirm, intro, outro, text } from "@clack/prompts";
import dedent from "dedent";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import packageJSON from "../package.json" with { type: "json" };
import { updateWorkspace } from "./update-workspace";

// Section - Exit Handling
process.on("SIGINT", () => {
  console.warn("\nPackage initialization aborted.");
  process.exit(0);
});

// Block - Constants

// Section - Packages with pinned version
const pinnedVerPackages = {
  devDependencies: {
    eslint: "^9.23.0",
    typescript: "^5.8.2",
    oxlint: "^0.16.3",
    "@sveltejs/adapter-static": "^3.0.8",
    "@sveltejs/kit": "^2.16.0",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.0.0",
    svelte: "^5.0.0",
    "svelte-check": "^4.0.0",
    vite: "^6.0.0",
    tailwindcss: "^4.0.0",
  },
};

// Section - Project name
const projectName = packageJSON.name;
if (!projectName.length)
  throw new Error("Could not find the project name. Is package.json set up correctly?");

//!Block

async function scaffoldSvelte() {
  intro("✨ Initializing new Svelte project ✨");

  const appName = (await text({
    message: `Enter the project's name:`,
    validate: (input) => {
      if (!input || !input.length) {
        cancel("The project name cannot be empty.");
        process.exit(1);
      }

      if (input.match(/[,./\\:]/)) {
        cancel(`The name contains invalid characters.`);
        process.exit(1);
      }
      return undefined;
    },
  })) as string;

  const appdir = path.resolve(import.meta.dirname, `../apps/${appName}`);
  if (existsSync(appdir)) {
    cancel("A folder with this name already exists.");
    process.exit(1);
  }

  const withBunInstall = await confirm({
    message: `Do you want to run 'bun install' after initialization?`,
    initialValue: true,
  });

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
    name: `${appName}`,
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
      [`@${appName}/linting-config`]: "workspace:*",
      "@eslint/config-inspector": "latest",
      ...pinnedVerPackages.devDependencies,
      "@eslint/js": "latest",
      "@types/node": "latest",
      globals: "latest",
      prettier: "latest",
      "@sveltejs/vite-plugin-svelte": "latest",
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

  // Section - Eslint Config
  const eslintConfig = `import { createEslintConfig } from '@${appName}/linting-config' \n export default createEslintConfig({ svelte: true})`;

  // Section - Prettier Config
  const prettierConfig = `import {prettierConfig} from '@${appName}/linting-config' \n export default prettierConfig`;

  await mkdir(path.resolve(appdir, "static"), { recursive: true });
  await mkdir(path.resolve(appdir, "src/lib"), { recursive: true });
  await mkdir(path.resolve(appdir, "src/routes"));
  await mkdir(path.resolve(appdir, "src/styles"));

  await writeFile(`${appdir}/package.json`, JSON.stringify(sveltePackageJSON, null, 2), "utf8");
  await writeFile(`${appdir}/vite.config.ts`, viteConfig, "utf8");
  await writeFile(`${appdir}/svelte.config.js`, svelteConfig, "utf8");
  await writeFile(`${appdir}/tsconfig.json`, JSON.stringify(svelteTsConfig, null, 2), "utf8");
  await writeFile(`${appdir}/.gitignore`, gitignore, "utf8");
  await writeFile(`${appdir}/eslint.config.js`, eslintConfig, "utf8");
  await writeFile(`${appdir}/prettier.config.js`, prettierConfig, "utf8");

  await writeFile(`${appdir}/src/app.html`, apphtml, "utf8");
  await writeFile(`${appdir}/src/app.d.ts`, appdts, "utf8");

  await writeFile(`${appdir}/src/routes/+layout.svelte`, layoutsvelte, "utf8");
  await writeFile(`${appdir}/src/routes/+page.svelte`, pagesvelte, "utf8");

  spawnSync(
    `curl -L https://raw.githubusercontent.com/Rick-Phoenix/tailwind-config/main/tailwind.css -o ${appdir}/src/styles/index.css `,
    { shell: true, stdio: "inherit" }
  );

  await updateWorkspace(
    path.resolve(import.meta.dirname, `../${projectName}.code-workspace`),
    `apps/${appName}`
  );

  if (withBunInstall) spawnSync(`cd ${appdir} && bun install`, { shell: true, stdio: "inherit" });

  outro("✨ Svelte project initialized succesfully. ✨");
}

await scaffoldSvelte();
