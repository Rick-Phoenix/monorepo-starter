import { Command, Option } from "@commander-js/extra-typings";
import {
  getUnsafePathChar,
  isValidPathComponent,
} from "@monorepo-starter/utils";

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
      "-d, --directory <directory>",
      "The directory where to install the package",
      "packages",
    )
    .option("--description <description>", "The package's description")
    .option("--no-description", "Skip prompt for the package's description")
    .option("-c, --cwd <cwd>", "The cwd for the process")
    .addOption(
      new Option("--lint-source <name>", "The type of lint config source")
        .choices(["local", "external"]),
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

export function initRepoCli() {
  const program = new Command()
    .option("-n, --name <name>", "The name for the monorepo")
    .option("-i, --install", "Install dependencies at the end of the script")
    .option(
      "--no-install",
      "Skip installing dependencies at the end of the script",
    )
    .option(
      "-d, --directory <directory>",
      "The directory where the monorepo will be created",
    )
    .addOption(
      new Option(
        "-l, --lint-config <type>",
        "The type of linting config to setup",
      )
        .choices(["opinionated", "minimal", "none"]),
    )
    .option("--no-lint", "Do not add a linting config package")
    .action((options) => {
      if (!options.lint) {
        options.lintConfig = "none";
      }
    })
    .option(
      "--lintConfig-name <name>",
      "The name of the linting config package",
      "linting-config",
    )
    .option("--no-scripts", "Do not include a scripts package")
    .option("-s, --scripts", "Include a scripts package")
    .option("-i, --install", "Install dependencies at the end of the script")
    .option(
      "--no-install",
      "Do not install dependencies at the end of the script",
    )
    .option("-g, --git", "Create a new git repo")
    .option("--no-git", "Do not create a new git repo")
    .parse(process.argv)
    .showHelpAfterError();

  const options = program.opts();

  if (options.directory) {
    if (!isValidPathComponent(options.directory)) {
      const unsafeChar = getUnsafePathChar(options.directory);
      program.error(
        `The directory contains an invalid character: '${unsafeChar}'`,
      );
    }
  }

  return options;
}
