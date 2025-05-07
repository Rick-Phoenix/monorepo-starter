import { Command, Option } from "@commander-js/extra-typings";
import {
  isNonEmptyArray,
  tryCatch,
  writeRender,
} from "@monorepo-starter/utils";
import download from "download";
import { resolve } from "node:path";

export async function genOxlintConfigCli(args?: string[]) {
  const program = new Command()
    .option(
      "-e, --extend <extended_config>",
      "Path to a config file to extend",
      "../../.oxlintrc.json",
    )
    .option("--no-extend", "Do not extend another config")
    .option(
      "-d, --directory <directory>",
      "The output directory for the config file",
    )
    .addOption(
      new Option("-k, --kind <kind>", "The kind of config file to generate")
        .choices([
          "minimal",
          "opinionated",
          "extend-console",
          "from-url",
        ])
        .default("opinionated"),
    )
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

  if (cliArgs.kind === "opinionated") {
    cliArgs.extend = false;
  }

  const outputTarget = resolve(cliArgs.directory || process.cwd());

  let action: Promise<unknown>;

  if (cliArgs.url) {
    action = download(cliArgs.url, outputTarget, {
      filename: ".oxlintrc.json",
    });
  } else {
    const templateFile = resolve(
      import.meta.dirname,
      "templates/configs/.oxlintrc.json.j2",
    );
    const outputFile = resolve(outputTarget, ".oxlintrc.json");
    const { extend, kind } = cliArgs;
    action = writeRender(templateFile, outputFile, { extend, kind });
  }

  const [_, error] = await tryCatch(
    action,
    "generating the oxlint config file",
  );

  if (error) {
    console.error(error);
  }
}
