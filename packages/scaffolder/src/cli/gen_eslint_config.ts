import { Command, Option } from "@commander-js/extra-typings";
import {
  isNonEmptyArray,
  tryCatch,
  writeRender,
} from "@monorepo-starter/utils";
import download from "download";
import { resolve } from "node:path";

export async function genEslintConfigCli(args?: string[]) {
  const program = new Command()
    .option(
      "-e, --extend <extended_config>",
      "Path to a config file to extend",
    )
    .option(
      "-d, --directory <directory>",
      "The output directory for the config file",
    )
    .addOption(
      new Option("-k, --kind <kind>", "The kind of config file to generate")
        .choices([
          "minimal",
          "minimal-extensible",
          "opinionated",
          "extended",
          "svelte-extended",
          "svelte-base",
          "from-url",
        ])
        .default("opinionated"),
    )
    .option(
      "-o, --oxlint-config <config_path>",
      "The path to the oxlint config to use with eslint-plugin-oxlint",
      "../../.oxlintrc.json",
    )
    .option("--no-oxlint", "Don't include eslint-plugin-oxlint")
    .addOption(
      new Option("-u, --url <url>", "The url for the config file to download")
        .implies({
          kind: "from-url",
        }),
    )
    .showHelpAfterError();

  if (isNonEmptyArray(args)) {
    program.parse(args, { from: "user" });
  } else {
    program.parse();
  }

  const cliArgs = program.opts();
  const outputTarget = resolve(cliArgs.directory || process.cwd());

  let action: Promise<unknown>;

  if (cliArgs.url) {
    action = download(cliArgs.url, outputTarget, {
      filename: "eslint.config.js",
    });
  } else {
    const templateFile = resolve(
      import.meta.dirname,
      "templates/configs/eslint.config.js.j2",
    );
    const outputFile = resolve(outputTarget, "eslint.config.js");
    const { extend, kind } = cliArgs;
    action = writeRender(templateFile, outputFile, { extend, kind });
  }

  const [_, error] = await tryCatch(action, "generating the config file");
  if (error) {
    console.error(error);
  } else if (!args) {
    console.log("✅ Eslint config file generated");
  }
}
