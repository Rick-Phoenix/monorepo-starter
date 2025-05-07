import { Command, Option } from "@commander-js/extra-typings";
import {
  isNonEmptyArray,
  tryCatch,
  writeRender,
} from "@monorepo-starter/utils";
import download from "download";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";

const pluginPresets = [
  { name: "copy", packageName: "rollup-plugin-copy" },
];

export async function genTsdownConfigCli(args?: string[]) {
  const program = new Command()
    .option(
      "-o, --output <output_path>",
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
        "-p, --package-manager <package_manager>",
        "The package manager to install tsdown with",
      ).default("pnpm").implies({ install: true }),
    )
    .showHelpAfterError();

  if (isNonEmptyArray(args)) {
    program.parse(args, { from: "user" });
  } else {
    program.parse();
  }

  const cliArgs = program.opts();

  const outputTarget = resolve(cliArgs.output || process.cwd());

  const plugins = cliArgs.plugin
    ? cliArgs.plugin.map((plugin) => {
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

  if (cliArgs.install) {
    const { error } = spawnSync(
      `${cliArgs.packageManager} install -D tsdown ${packageNames.join(" ")}`,
      {
        stdio: "inherit",
        shell: true,
        cwd: dirname(outputTarget),
      },
    );

    if (error) process.exit(1);
  }

  let action: Promise<unknown>;

  if (cliArgs.url) {
    action = download(cliArgs.url, outputTarget, {
      filename: "tsdown.config.js",
    });
  } else {
    const templateFile = resolve(
      import.meta.dirname,
      "templates/configs/tsdown.config.js",
    );

    const outputFile = resolve(outputTarget, "tsdown.config.js");
    action = writeRender(templateFile, outputFile, { plugins });
  }

  const [_, error] = await tryCatch(
    action,
    "generating the tsdown config file",
  );

  if (error) {
    console.error(error);
  }
}
