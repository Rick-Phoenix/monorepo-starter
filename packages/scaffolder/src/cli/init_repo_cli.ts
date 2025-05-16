import { Command, Option } from "@commander-js/extra-typings";
import { packageManagers } from "../lib/install_package.js";

export function initRepoCli(injectedArgs?: string[]) {
  const program = new Command()
    .option("-n, --name <name>", "The name for the monorepo")
    .option(
      "-d, --directory <directory>",
      "The directory where the monorepo will be created",
    )
    .option(
      "-l, --lint",
      "Create a local package for linting configuration",
    )
    .addOption(
      new Option(
        "--lint-name <name>",
        "The name of the linting config package",
      ).default("linting-config").implies({ lint: true }),
    )
    .option(
      "--no-lint",
      "Do not create an internal linting config package",
    )
    .option(
      "-o, --oxlint",
      "Create an oxlint config file",
    )
    .option(
      "--no-oxlint",
      "Do not create a config file for oxlint",
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
    .option(
      "--default-packages",
      "Install basic packages and skip the prompt to select more",
    )
    .addOption(
      new Option("--git-hook", "Add a pre-commit hook to use with husky")
        .implies({ git: true }),
    )
    .option(
      "-a, --add <packages...>",
      "Extra packages to include as dependencies",
    )
    .option("--moon", "Generate moonrepo config files")
    .option("--moon-tasks", "Add global tasks to .moon/tasks.yml")
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
