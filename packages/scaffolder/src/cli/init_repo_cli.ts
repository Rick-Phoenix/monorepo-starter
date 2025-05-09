import { Command, Option } from "@commander-js/extra-typings";

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
        "-l, --lint <type>",
        "The type of linting config package to setup",
      )
        .choices(["minimal", "opinionated", ""]).default("minimal"),
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
    .option(
      "-c, --catalog",
      "Use the pnpm catalog to pin versions for key packages (recommended)",
    )
    .option(
      "--no-catalog",
      "Do not use the pnpm catalog for key packages (not recommended)",
    )
    .option("--moon", "Add a full moonrepo config")
    .parse(process.argv)
    .showHelpAfterError();

  const options = program.opts();

  return options;
}
