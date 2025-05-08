import { Command, Option } from "@commander-js/extra-typings";
import {
  isNonEmptyArray,
  promptIfFileExists,
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

export async function genVitestConfigCli(injectedArgs?: string[]) {
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
        "-p, --package-manager <package_manager>",
        "The package manager to install tsdown with",
      ).choices(packageManagers).default("pnpm").implies({ install: true }),
    )
    .option(
      "--test-dir <test_dir>",
      "Create a directory for tests",
    )
    .showHelpAfterError();

  if (isNonEmptyArray(injectedArgs)) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const args = program.opts();

  const outputDir = resolve(args.dir || process.cwd());

  if (outputDir !== process.cwd()) {
    await mkdir(outputDir, { recursive: true });
  }

  const outputFile = join(outputDir, "vitest.config.js");

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
    const isOk = installPackages(
      ["vitest", ...packageNames],
      args.packageManager,
      true,
    );

    if (!isOk) process.exit(1);
  }

  if (args.testDir) {
    const [_, error] = await tryCatch(
      mkdir(resolve(args.testDir), { recursive: true }),
      "creating the tests directory",
    );
    // eslint-disable-next-line no-console
    if (error) console.warn(error);
  }

  if (args.script) {
    const [packageJson, error] = await tryCatch(
      readPackage({ normalize: false }),
      "reading the package.json file",
    );
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(error);
    } else {
      packageJson.scripts = packageJson.scripts || {};
      if (packageJson.scripts.test) {
        packageJson.___test = "vitest run";
      } else {
        packageJson.scripts.test = "vitest run";
      }

      const [_, writeErr] = await tryCatch(
        writeJsonFile(join(outputDir, "package.json"), packageJson, {
          detectIndent: true,
        }),
      );

      // eslint-disable-next-line no-console
      if (writeErr) console.warn(writeErr);
    }
  }

  let action: Promise<unknown>;

  if (args.url) {
    action = download(args.url, outputDir, {
      filename: "vitest.config.js",
    });
  } else {
    const templateFile = resolve(
      import.meta.dirname,
      "../templates/configs/vitest.config.js",
    );

    action = writeRender(templateFile, outputFile, { plugins });
  }

  const [_, error] = await tryCatch(
    action,
    "generating the vitest config file",
  );

  if (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  // eslint-disable-next-line no-console
  console.log("✅ Vitest config generated.");
}
