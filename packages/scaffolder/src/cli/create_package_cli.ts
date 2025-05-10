import { Command, Option } from "@commander-js/extra-typings";
import { packageManagers } from "../lib/install_package.js";
import { packagesPresetChoices } from "../lib/packages_list.js";
import { scriptsPresets } from "./gen_scripts.js";

export function createPackageCli() {
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
    .addOption(new Option("--no-lint").implies({ lintSource: "none" }))
    .option(
      "-c, --catalog",
      "Use the pnpm catalog for key packages (recommended)",
    )
    .option(
      "--tests-dir <tests_dir>",
      "The relative path to the tests directory (from the package's root)",
    )
    .option("--skip-configs", "Skip prompt for config files generation")
    .option(
      "--default-configs",
      "Accept all defaults for config files generation",
    )
    .addOption(
      new Option("-p, --preset <preset...>").choices(packagesPresetChoices),
    )
    .option(
      "-a, --add <package...>",
      "Extra packages to include as dependencies",
    )
    .addOption(new Option("-s, --scripts [scripts...]").choices(scriptsPresets))
    .option(
      "--multi-project",
      "Add a separate tsconfig file for files outside of src",
    )
    .option(
      "--moon",
      "Include a moon.yml file (with tasks for the scripts, if any are selected)",
    )
    .addOption(
      new Option(
        "-m, --package-manager <package_manager>",
        "The package manager to use in the installation",
      ).choices(packageManagers).implies({ install: true }),
    )
    .parse(process.argv)
    .showHelpAfterError();

  const options = program.opts();

  if (options.catalog && options.packageManager !== "pnpm") {
    program.error("The 'catalog' option is only available with pnpm.");
  }

  return options;
}
