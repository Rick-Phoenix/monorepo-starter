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

export async function genOxlintConfig(injectedArgs?: string[]) {
  const program = new Command()
    .option(
      "-e, --extend <extended_config>",
      "Path to a config file to extend",
      "../../.oxlintrc.json",
    )
    .option("--no-extend", "Do not extend another config")
    .option(
      "-d, --dir <directory>",
      "The directory for the generated file (default is cwd)",
    )
    .option("-i, --install", "Install oxlint as a package")
    .addOption(
      new Option(
        "-p, --package-manager <package_manager>",
        "The package manager to use in the installation",
      ).choices(packageManagers).default("pnpm").implies({ install: true }),
    )
    .addOption(
      new Option("-k, --kind <kind>", "The kind of config file to generate")
        .choices([
          "minimal",
          "extensive",
          "from-url",
        ])
        .default("extensive"),
    )
    .addOption(
      new Option("-u, --url <url>", "The url for the config file to download")
        .implies({
          kind: "from-url",
        }),
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

  if (args.install) {
    const isOk = installPackages("oxlint", args.packageManager);
    if (!isOk) process.exit(1);
  }

  if (args.kind === "extensive") {
    args.extend = false;
  }

  const outputDir = resolve(args.dir || process.cwd());

  if (outputDir !== process.cwd()) {
    await tryAction(
      mkdir(outputDir, { recursive: true }),
      `creating ${outputDir}`,
      { fatal: true },
    );
  }

  const outputFile = join(outputDir, ".oxlintrc.json");

  await promptIfFileExists(outputFile);

  let action: Promise<unknown>;

  if (args.url) {
    action = download(args.url, outputDir, {
      filename: ".oxlintrc.json",
    });
  } else {
    const templateFile = resolve(
      import.meta.dirname,
      "../templates/configs/.oxlintrc.json.j2",
    );
    const { extend, kind } = args;
    action = writeRender(
      { templateFile, outputDir, ctx: { extend, kind } },
    );
  }

  const isOk = await tryAction(action, "generating the oxlint config file", {
    fatal,
  });

  if (isOk) log.success("✅ Oxlint config generated.");
}
