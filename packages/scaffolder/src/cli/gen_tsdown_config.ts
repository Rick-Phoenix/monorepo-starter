import { log } from "@clack/prompts";
import { Command, Option } from "@commander-js/extra-typings";
import {
  promptIfFileExists,
  tryAction,
  writeRender,
} from "@monorepo-starter/utils";
import download from "download";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { installPackages, packageManagers } from "../lib/install_package.js";

const pluginPresets = [
  { name: "copy", packageName: "rollup-plugin-copy" },
];

export async function genTsdownConfig(injectedArgs?: string[]) {
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
    .option("-i, --install", "Install tsdown and the selected plugins")
    .addOption(
      new Option(
        "-m, --package-manager <package_manager>",
        "The package manager to install tsdown with",
      ).choices(packageManagers).default("pnpm").implies({ install: true }),
    )
    .option(
      "--build-tsconfig <path>",
      "The path to the tsconfig to use with tsdown",
      "tsconfig.json",
    )
    .showHelpAfterError();

  const isRunningAsCli = !injectedArgs;
  const fatal = process.env.NODE_ENV === "test" || isRunningAsCli;

  if (!isRunningAsCli) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const args = program.opts();

  const outputDir = resolve(args.dir || process.cwd());

  if (outputDir !== process.cwd()) {
    await tryAction(
      mkdir(outputDir, { recursive: true }),
      `creating ${outputDir}`,
      { fatal },
    );
  }

  const outputFile = join(outputDir, "tsdown.config.ts");

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

  let isOk: boolean | undefined;

  if (args.install) {
    isOk = installPackages(
      ["tsdown", ...packageNames],
      args.packageManager,
      true,
    );

    if (!isOk) process.exit(1);
  }

  let action: Promise<unknown>;

  if (args.url) {
    action = download(args.url, outputDir, {
      filename: "tsdown.config.ts",
    });
  } else {
    const templateFile = resolve(
      import.meta.dirname,
      "../templates/configs/tsdown.config.ts.j2",
    );

    action = writeRender({ templateFile, outputDir, ctx: { plugins } });
  }

  isOk = await tryAction(action, "generating the tsdown config file", {
    fatal,
  });

  if (isOk) {
    log.success("✅ Tsdown config generated.");
  }
}
