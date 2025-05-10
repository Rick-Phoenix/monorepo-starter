import { log } from "@clack/prompts";
import { Command, Option } from "@commander-js/extra-typings";
import {
  isNonEmptyArray,
  promptIfFileExists,
  tryCatch,
  writeRenderV2,
} from "@monorepo-starter/utils";
import download from "download";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { installPackages, packageManagers } from "../lib/install_package.js";

export async function genEslintConfigCli(injectedArgs?: string[]) {
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
        .choices([
          "base",
          "extended",
          "from-url",
        ])
        .default("base"),
    )
    .addOption(
      new Option(
        "--oxlint-config <config_path>",
        "The path to the oxlint config to use with eslint-plugin-oxlint",
      ).default("../../.oxlintrc.json").implies({ oxlint: true }),
    )
    .addOption(
      new Option("--multi-project", "Use multiple tsconfig files").implies({
        kind: "extended",
      }),
    )
    .addOption(
      new Option(
        "--second-tsconfig <tsconfig_name>",
        "The name of the second tsconfig file to include in the projects array",
      ).default("tsconfig.spec.json"),
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
    .addOption(new Option("-p, --plugin <plugin...>"))
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
  const outputFile = join(outputDir, "eslint.config.js");

  await promptIfFileExists(outputFile);

  if (args.install) {
    const plugins: string[] = args.plugin ?? [];
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

    if (!isOk) process.exit(1);
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
      multiProject,
      secondTsconfig,
    } = args;
    action = writeRenderV2({
      outputDir,
      templateFile,
      ctx: {
        extend,
        kind,
        oxlint,
        oxlintConfig,
        prettier,
        multiProject,
        secondTsconfig,
      },
    });
  }

  const [_, error] = await tryCatch(
    action,
    "generating the eslint config file",
  );

  if (error) {
    console.error(error);
  } else {
    log.success("✅ Eslint config generated");
  }
}
