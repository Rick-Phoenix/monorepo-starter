import { log } from "@clack/prompts";
import { Command, Option } from "@commander-js/extra-typings";
import {
  promptIfFileExists,
  recursiveRender,
  showWarning,
  tryAction,
  tryCatch,
  writeRender,
} from "@monorepo-starter/utils";
import download from "download";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readPackage } from "read-pkg";
import { writeJsonFile } from "write-json-file";
import { installPackages, packageManagers } from "../lib/install_package.js";

const pluginPresets = [
  { name: "", packageName: "" },
];

export async function genVitestConfig(injectedArgs?: string[]) {
  const program = new Command()
    .option(
      "-d, --dir <directory>",
      "The directory for the generated file (default is cwd)",
    )
    .addOption(new Option("-p, --plugin <plugin...>"))
    .addOption(
      new Option("-u, --url <url>", "The url for the config file to download")
        .implies({
          kind: "from-url",
        }),
    )
    .option("-i, --install", "Install vitest and the selected plugins")
    .option("-s, --script", "Add vitest as the test script")
    .addOption(
      new Option(
        "-m, --package-manager <package_manager>",
        "The package manager to install tsdown with",
      ).choices(packageManagers).default("pnpm").implies({ install: true }),
    )
    .option(
      "--tests-dir [test_dir]",
      "Create a directory for tests at the specified path (relative to --dir, defaults to ./tests)",
    )
    .option(
      "--full",
      "Create a full setup, including a tests directory and a setup file",
    )
    .showHelpAfterError();

  const isRunningAsCli = !injectedArgs;
  const fatal = isRunningAsCli;

  if (!isRunningAsCli) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const args = program.opts();

  if (args.testsDir === true || args.full) {
    args.testsDir = "tests";
  }

  const outputDir = resolve(args.dir || process.cwd());

  let isOk: boolean | undefined;

  if (outputDir !== process.cwd()) {
    isOk = await tryAction(
      mkdir(outputDir, { recursive: true }),
      `creating ${outputDir}`,
      { fatal },
    );
  }

  const outputFile = join(outputDir, "vitest.config.ts");

  await promptIfFileExists(outputFile);

  const plugins = args.plugin
    ? args.plugin.map((plugin) => {
      for (const preset of pluginPresets) {
        if (plugin === preset.name) {
          return { name: plugin, packageName: preset.packageName };
        } else if (plugin === preset.packageName) {
          return { name: preset.name, packageName: plugin };
        }
      }

      return { name: plugin, packageName: plugin };
    })
    : [];

  const packageNames = plugins.map((p) => p.packageName);

  if (args.install) {
    isOk = installPackages(
      ["vitest", ...packageNames],
      args.packageManager,
      true,
    );

    if (!isOk) process.exit(1);
  }

  if (args.testsDir) {
    isOk = await tryAction(
      mkdir(join(outputDir, args.testsDir), { recursive: true }),
      "creating the tests directory",
      { fatal },
    );

    if (args.full) {
      isOk = await tryAction(
        recursiveRender({
          outputDir: join(outputDir, args.testsDir),
          templatesDir: resolve(import.meta.dirname, "../templates/tests"),
          overwrite: false,
        }),
        "writing the files to the tests folder",
        { fatal },
      );
    }
  }

  if (args.script) {
    const [packageJson, error] = await tryCatch(
      readPackage({ normalize: false, cwd: outputDir }),
      "reading the package.json file",
    );
    if (error) {
      isOk = false;
      showWarning(error, true);
    } else {
      packageJson.scripts = packageJson.scripts || {};
      if (packageJson.scripts.test) {
        packageJson.___test = "vitest run";
      } else {
        packageJson.scripts.test = "vitest run";
      }

      isOk = await tryAction(
        writeJsonFile(join(outputDir, "package.json"), packageJson, {
          detectIndent: true,
        }),
        "writing the tests script to package.json",
        { fatal },
      );
    }
  }

  let action: Promise<unknown>;

  if (args.url) {
    action = download(args.url, outputDir, {
      filename: "vitest.config.ts",
    });
  } else {
    const templateFile = resolve(
      import.meta.dirname,
      "../templates/configs/vitest.config.ts.j2",
    );

    action = writeRender({
      templateFile,
      outputDir,
      ctx: { plugins, fullSetup: args.full },
    });
  }

  isOk = await tryAction(
    action,
    "generating the vitest config file",
    { fatal },
  );

  if (isOk) log.success("✅ Vitest config generated.");
}
