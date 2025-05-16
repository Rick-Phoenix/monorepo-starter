import { log } from "@clack/prompts";
import { Command, Option } from "@commander-js/extra-typings";
import {
  isDir,
  promptIfFileExists,
  recursiveRender,
  tryAction,
} from "@monorepo-starter/utils";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { installPackages, packageManagers } from "../lib/install_package.js";

export async function genMoonConfig(injectedArgs?: string[]) {
  const program = new Command()
    .option(
      "-d, --dir <directory>",
      "The target directory for installation (defaults to cwd)",
    )
    .option("-i, --install", "Install moon as a local package")
    .addOption(
      new Option(
        "--tasks",
        "Add global tasks to tasks.yml",
      ),
    )
    .addOption(
      new Option(
        "-p, --package-manager <package_manager>",
        "The package manager to use in the installation",
      ).choices(packageManagers).default("pnpm"),
    )
    .option(
      "--project-tsconfig <name>",
      "The name of the tsconfig file at the project level",
      "tsconfig.src.json",
    )
    .option(
      "--root-options-tsconfig <name>",
      "The name of the extensible tsconfig file at the root of the monorepo",
      "tsconfig.options.json",
    )
    .showHelpAfterError();

  const isRunningAsCli = !injectedArgs;
  const fatal = process.env.NODE_ENV === "test" || isRunningAsCli;

  if (!isRunningAsCli) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const args = program.opts();

  let isOk: boolean | undefined;

  if (args.install) {
    isOk = installPackages("@moonrepo/cli", args.packageManager, true);
    if (!isOk) log.warn("Could not install moonrepo as a package.");
  }

  const outputDir = resolve(args.dir || process.cwd(), ".moon");

  const outputFiles = ["toolchain.yml", "tasks.yml", "workspace.yml"];

  if (await isDir(outputDir)) {
    for (const file of outputFiles) {
      await promptIfFileExists(join(outputDir, file));
    }
  }

  isOk = await tryAction(
    mkdir(outputDir, { recursive: true }),
    "creating the .moon folder",
    { fatal },
  );

  const { rootOptionsTsconfig, projectTsconfig, packageManager } = args;

  isOk = await tryAction(
    recursiveRender({
      nunjucksRoot: join(import.meta.dirname, "../templates/moon"),
      outputDir,
      templatesDir: "dot_moon",
      ctx: {
        tasks: args.tasks,
        rootOptionsTsconfig,
        projectTsconfig,
        packageManager,
      },
    }),
    "generating the files within .moon",
    { fatal },
  );

  if (isOk) log.success("✅ Moon setup completed.");
}
