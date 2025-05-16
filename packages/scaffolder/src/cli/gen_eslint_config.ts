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

export const eslintConfigChoices = [
  "base",
  "extended",
  "from-url",
] as const;

export async function genEslintConfig(injectedArgs?: string[]) {
  const program = new Command()
    .option(
      "-e, --extend <extended_config>",
      "The package where to import a config",
    )
    .option(
      "-d, --dir <directory>",
      "The directory for the generated file (default is cwd)",
    )
    .addOption(
      new Option("-k, --kind <kind>", "The kind of config file to generate")
        .choices(eslintConfigChoices)
        .default("base"),
    )
    .addOption(
      new Option(
        "--oxlint-config <config_path>",
        "The path to the oxlint config to use with eslint-plugin-oxlint",
      ).default("../../.oxlintrc.json").implies({ oxlint: true }),
    )
    .option("-o, --oxlint", "Include eslint-plugin-oxlint")
    .option("--no-prettier", "Do not include eslint-config-prettier")
    .addOption(
      new Option("-u, --url <url>", "The url for the config file to download")
        .implies({
          kind: "from-url",
        }),
    )
    .option("-i, --install", "Install eslint and the selected plugins")
    .addOption(
      new Option(
        "-m, --package-manager <package_manager>",
        "The package manager to use in the installation",
      ).choices(packageManagers).default("pnpm").implies({ install: true }),
    )
    .addOption(new Option("-p, --plugins <plugins...>"))
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
      `creating the the directory ${outputDir}`,
      { fatal: true },
    );
  }

  const outputFile = join(outputDir, "eslint.config.js");

  await promptIfFileExists(outputFile);

  if (args.install) {
    const plugins: string[] = args.plugins ?? [];
    if (args.oxlint) {
      plugins.push("eslint-plugin-oxlint");
    } else if (args.prettier) {
      plugins.push("eslint-config-prettier");
    } else if (args.kind === "base") {
      plugins.push("@antfu/eslint-config", "eslint-flat-config-utils");
    }

    const isOk = installPackages(
      [
        "eslint",
        "@eslint/config-inspector",
        ...plugins,
      ],
      args.packageManager,
      true,
    );

    if (!isOk) {
      console.error("An error occurred while installing the packages.");
      process.exit(1);
    }
  }

  let action: Promise<unknown>;

  if (args.url) {
    action = download(args.url, outputDir, {
      filename: "eslint.config.js",
    });
  } else {
    const templateFile = resolve(
      import.meta.dirname,
      "../templates/configs/eslint.config.js.j2",
    );
    const {
      extend,
      kind,
      oxlint,
      oxlintConfig,
      prettier,
    } = args;
    action = writeRender({
      outputDir,
      templateFile,
      ctx: {
        extend,
        kind,
        oxlint,
        oxlintConfig,
        prettier,
      },
    });
  }

  const isOk = await tryAction(action, "generating the eslint config file", {
    fatal,
  });

  if (isOk) log.success("✅ Eslint config generated");
}
