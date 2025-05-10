import { Command, Option } from "@commander-js/extra-typings";
import { packageManagers } from "../lib/install_package.js";
import { eslintConfigChoices } from "./gen_eslint_config.js";

export function initRepoCli() {
  const program = new Command()
    .option("-n, --name <name>", "The name for the monorepo")
    .option(
      "-d, --directory <directory>",
      "The directory where the monorepo will be created",
    )
    .option(
      "--lint-name <name>",
      "The name of the linting config package",
      "linting-config",
    )
    .addOption(
      new Option(
        "-l, --lint",
        "Create a local package for linting configuration",
      )
        .choices(eslintConfigChoices).default("base"),
    )
    .addOption(
      new Option(
        "--no-lint",
        "Do not create an internal linting config package",
      ),
    )
    .addOption(
      new Option("-o, --oxlint <config_type>").choices([
        "minimal",
        "opinionated",
        "",
      ]).default("minimal"),
    )
    .addOption(
      new Option("--no-oxlint", "Do not create a config file for oxlint"),
    )
    .option("-i, --install", "Install dependencies at the end of the script")
    .option(
      "--no-install",
      "Do not install dependencies at the end of the script",
    )
    .option("--no-git", "Do not create a new git repo")
    .addOption(new Option(
      "-c, --catalog",
      "Use the pnpm catalog to pin versions for key packages (recommended)",
    ).implies({ packageManager: "pnpm" }))
    .addOption(
      new Option(
        "-m, --package-manager <package_manager>",
        "The package manager to use for installing dependencies",
      ).choices(packageManagers),
    )
    .option("--moon", "Add a full moonrepo config")
    .parse(process.argv)
    .showHelpAfterError();

  const options = program.opts();

  if (options.catalog && options.packageManager !== "pnpm") {
    program.error("The 'catalog' option is only available with pnpm.");
  }

  return options;
}
