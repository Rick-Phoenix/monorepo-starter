import { Command, Option } from "@commander-js/extra-typings";
import {
  getUnsafePathChar,
  isValidPathComponent,
} from "@monorepo-starter/utils";
import { packagesPresetChoices } from "../lib/packages_list.js";

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
    .parse(process.argv)
    .showHelpAfterError();

  const options = program.opts();

  if (options.name) {
    if (!isValidPathComponent(options.name)) {
      const unsafeChar = getUnsafePathChar(options.name);
      program.error(`The name contains an invalid character: '${unsafeChar}'`);
    }
  }

  return options;
}
