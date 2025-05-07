import { Command, Option } from "@commander-js/extra-typings";

export function initRepoCli() {
  const program = new Command()
    .option("-n, --name <name>", "The name for the monorepo")
    .option(
      "-d, --directory <directory>",
      "The directory where the monorepo will be created",
    )
    .option(
      "--lint-config-name <name>",
      "The name of the linting config package",
      "linting-config",
    )
    .addOption(
      new Option(
        "--lint-config <type>",
        "The type of linting config package to setup",
      )
        .choices(["minimal", "opinionated", ""]),
    )
    .addOption(
      new Option(
        "--no-lint",
        "Do not create an internal linting config package",
      ).implies({ lintConfig: "" }),
    )
    .option("--no-oxlint", "Do not create a .oxlintrc.json file")
    .option("--no-scripts", "Do not include a scripts package")
    .option("-s, --scripts", "Include a scripts package")
    .option("-i, --install", "Install dependencies at the end of the script")
    .option(
      "--no-install",
      "Do not install dependencies at the end of the script",
    )
    .option("-g, --git", "Create a new git repo")
    .option("--no-git", "Do not create a new git repo")
    .option(
      "--no-catalog",
      "Do not use the pnpm catalog for key packages (not recommended)",
    )
    .parse(process.argv)
    .showHelpAfterError();

  const options = program.opts();

  return options;
}
