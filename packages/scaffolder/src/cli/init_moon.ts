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

export const moonTaskPresets = ["test", "build", "clean"];

export async function genMoonConfig(injectedArgs?: string[]) {
  const program = new Command()
    .option(
      "-d, --dir <directory>",
      "The target directory for installation (defaults to cwd)",
    )
    .option("-i, --install", "Install moon as a local package")
    .addOption(
      new Option(
        "-t, --task <task...>",
        "A list of global tasks to add to .moon/tasks.yml",
      ).choices(moonTaskPresets).default(moonTaskPresets),
    )
    .addOption(
      new Option(
        "--no-task",
        "Do not add any global tasks",
      ).implies({ task: [] }),
    )
    .addOption(
      new Option(
        "-p, --package-manager <package_manager>",
        "The package manager to use in the installation",
      ).choices(packageManagers).default("pnpm").implies({ install: true }),
    )
    .showHelpAfterError();

  const isRunningAsCli = !injectedArgs;
  const fatal = isRunningAsCli;

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

  const tasks: Record<string, boolean> = {};

  for (const task of args.task || []) {
    tasks[task] = true;
  }

  isOk = await tryAction(
    recursiveRender({
      templatesRoot: join(import.meta.dirname, "../templates/moon"),
      outputDir,
      templatesDir: "dot_moon",
      ctx: {
        tasks,
      },
    }),
    "generating the files within .moon",
    { fatal },
  );

  if (isOk) log.success("✅ Moon setup completed.");
}
