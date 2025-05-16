import { Command, Option } from "@commander-js/extra-typings";
import { packageManagers } from "../lib/install_package.js";
import { scriptsPresets } from "./gen_scripts.js";

export function createPackageCli(injectedArgs?: string[]) {
  const program = new Command()
    .option("-n, --name <name>", "The name of the new package")
    .option("-e, --env", "Include a type-safe env parsing module")
    .option("--no-env", "Do not include an env parsing module")
    .option(
      "--lint-name <name>",
      "The name of the linting config package",
    )
    .option("-i, --install", "Install dependencies at the end of the script")
    .option(
      "--no-install",
      "Skip installing dependencies at the end of the script",
    )
    .option(
      "-d, --dir <directory>",
      "The directory where to install the package",
      "packages",
    )
    .option("--description <description>", "The package's description")
    .option("--no-description", "Skip prompt for the package's description")
    .addOption(
      new Option("--lint-source <name>", "The type of lint config source")
        .choices(["workspace", "external", "new", "none"]),
    )
    .addOption(
      new Option("--no-lint", "Do not use a linting config").implies({
        lintSource: "none",
      }),
    )
    .addOption(new Option(
      "-c, --catalog",
      "Use the pnpm catalog for key packages (recommended)",
    ).implies({ packageManager: "pnpm" }))
    .option("--skip-configs", "Skip prompt for config files generation")
    .addOption(new Option(
      "--default-configs",
      "Accept all defaults for config files generation",
    ).implies({ skipConfigs: false }))
    .option(
      "-a, --add <package...>",
      "Add a specific package (or multiple) to the dependencies",
    )
    .addOption(
      new Option(
        "-s, --scripts [scripts...]",
        "Add a scripts directory (with the selected presets, if there are any)",
      ).choices(scriptsPresets),
    )
    .option(
      "--moon",
      "Include a moon.yml file (with tasks for the selected scripts presets, if there are any)",
    )
    .addOption(
      new Option(
        "-m, --package-manager <package_manager>",
        "The package manager to use in the installation",
      ).choices(packageManagers).implies({ install: true }),
    )
    .option(
      "--no-additional-packages",
      "Skip the prompt for selecting additional packages",
    )
    .option(
      "--default-packages",
      "Install the default packages and skip the prompt to select more",
    )
    .option(
      "--root-tsconfig <tsconfig_name>",
      "The name of the tsconfig file at the root to be extended",
      "tsconfig.options.json",
    )
    .option(
      "--src-tsconfig <name>",
      "The name of the tsconfig file responsible for files inside src",
      "tsconfig.src.json",
    )
    .option(
      "--dev-tsconfig <name>",
      "The name of the tsconfig file responsible for tests, scripts and config files",
      "tsconfig.dev.json",
    )
    .showHelpAfterError();

  if (injectedArgs) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const options = program.opts();

  if (options.catalog && options.packageManager !== "pnpm") {
    program.error("The 'catalog' option is only available with pnpm.");
  }

  return options;
}
