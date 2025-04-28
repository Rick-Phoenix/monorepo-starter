import { tryThrowSync } from "@monorepo-starter/utils";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve as res } from "node:path";
// eslint-disable no-console
import { cancel, confirm, intro, outro, text } from "@clack/prompts";
import { type } from "arktype";
import { file } from "bun";
import { findUpSync } from "find-up";
import { render } from "nunjucks";
import { readPackageSync } from "read-pkg";

process.on("SIGINT", () => {
  console.warn("\nPackage initialization aborted.");
  process.exit(0);
});

const curdir = import.meta.dirname;

const string = type("string");

const monorepoRoot = dirname(string.assert(
  tryThrowSync(
    () =>
      findUpSync(["pnpm-workspace.yaml"], {
        type: "file",
        cwd: curdir,
      }),
    "Getting the path to the monorepo root",
  ),
));

const rootPackageJson = readPackageSync({ cwd: monorepoRoot });

const monorepoName = rootPackageJson.name;

if (!monorepoName.length) {
  throw new Error(
    "Could not find the project name. Is package.json set up correctly?",
  );
}

async function scaffoldSvelte() {
  intro("✨ Initializing new Svelte project ✨");

  const appName = (await text({
    message: `Enter the project's name:`,
    defaultValue: "svelte-app",
    placeholder: "svelte-app",
    initialValue: "svelte-app",
    validate: (input) => {
      if (!input || !input.length) {
        cancel("The project name cannot be empty.");
        process.exit(1);
      }

      if (input.match(/[,./\\:]/)) {
        cancel("The name contains invalid characters.");
        process.exit(1);
      }
      return undefined;
    },
  })) as string;

  const appDir = res(monorepoRoot, "apps");
  if (existsSync(appDir)) {
    cancel("A folder with this name already exists.");
    process.exit(1);
  }

  const withInstall = await confirm({
    message: `Do you want to run 'pnpm install' after initialization?`,
    initialValue: true,
  });

  const svelteTsConfig = {
    extends: ["../../tsconfig.options.json", "./.svelte-kit/tsconfig.json"],
    compilerOptions: {
      moduleResolution: "bundler",
      module: "ESNext",
      allowJs: true,
      checkJs: true,
      plugins: [
        {
          name: "typescript-svelte-plugin",
          assumeIsSvelteProject: true,
        },
      ],
    },
  };

  const templatesDir = res(curdir, "templates");

  const gitignore = await file(join(templatesDir, ".gitignore.j2")).text();

  const svelteTemplatesDir = join(templatesDir, "svelte");

  const viteConfig = await file(
    res(svelteTemplatesDir, "vite_config.ts.j2"),
  ).text();

  const svelteConfig = await file(
    join(svelteTemplatesDir, "svelte_config.js.j2"),
  )
    .text();

  const sveltePackageJSON = render(
    join(svelteTemplatesDir, "package.json.j2"),
    {
      monorepoName,
      appName,
    },
  );

  const appHtml = await file(join(svelteTemplatesDir, "app.html.j2")).text();

  const appdts = await file(join(svelteTemplatesDir, "app.d.ts.j2")).text();

  const layoutSvelte = await file(join(svelteTemplatesDir, "layout.svelte.j2"))
    .text();

  const pageSvelte = await file(join(svelteTemplatesDir, "page.svelte.j2"))
    .text();

  const lintPkgName = "linting-config";

  const eslintConfig =
    `import { createEslintConfig } from '@${monorepoName}/${lintPkgName}' \n export default createEslintConfig({ svelte: true})`;

  await mkdir(res(appDir, "static"), { recursive: true });
  await mkdir(res(appDir, "src/lib"), { recursive: true });
  await mkdir(res(appDir, "src/routes"));
  await mkdir(res(appDir, "src/styles"));

  await writeFile(
    `${appDir}/package.json`,
    sveltePackageJSON,
    "utf8",
  );
  await writeFile(`${appDir}/vite.config.ts`, viteConfig, "utf8");
  await writeFile(`${appDir}/svelte.config.js`, svelteConfig, "utf8");
  await writeFile(
    `${appDir}/tsconfig.json`,
    JSON.stringify(svelteTsConfig, null, 2),
    "utf8",
  );
  await writeFile(`${appDir}/.gitignore`, gitignore, "utf8");
  await writeFile(`${appDir}/eslint.config.js`, eslintConfig, "utf8");

  await writeFile(`${appDir}/src/app.html`, appHtml, "utf8");
  await writeFile(`${appDir}/src/app.d.ts`, appdts, "utf8");

  await writeFile(`${appDir}/src/routes/+layout.svelte`, layoutSvelte, "utf8");
  await writeFile(`${appDir}/src/routes/+page.svelte`, pageSvelte, "utf8");

  spawnSync(
    `curl -L https://raw.githubusercontent.com/Rick-Phoenix/tailwind-config/main/tailwind.css -o ${appDir}/src/styles/index.css `,
    { shell: true, stdio: "inherit" },
  );

  if (withInstall) {
    spawnSync(`cd ${appDir} && pnpm install`, {
      shell: true,
      stdio: "inherit",
    });
  }

  outro("✨ Svelte project initialized succesfully. ✨");
}

await scaffoldSvelte();
