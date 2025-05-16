import { Command, Option } from "@commander-js/extra-typings";
import { updatePnpmCatalog } from "@monorepo-starter/utils";
import { spawnSync } from "node:child_process";

export async function updateCatalogCli(injectedArgs?: string[]) {
  const program = new Command()
    .option(
      "-p, --path <path>",
      "The path to the pnpm-workspace file",
      "pnpm-workspace.yaml",
    )
    .option("--no-main-catalog", "Do not update the main catalog")
    .option(
      "-c, --catalogs <named_catalogs...>",
      "The named catalogs to update",
    )
    .option(
      "--no-install",
      "Do not run 'pnpm install' after updating the catalog",
    )
    .option(
      "-e, --exclude <packages...>",
      "Do not update the version for specific packages (cannot be used with include)",
    )
    .addOption(
      new Option("--all", "Update all the named catalogs").implies({
        catalog: "all",
      }),
    )
    .option(
      "-i, --include <packages...>",
      "Update the selected packages and exclude others by default (incompatible with exclude)",
    )
    .option(
      "--add-only",
      "Only add new entries to the catalog, do not update other entries",
    )
    .option(
      "-a, --add <packages...>",
      "Add the selected packages to the catalog",
    );

  if (injectedArgs) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const args = program.opts();

  const { path, exclude, include, add, catalogs, mainCatalog, addOnly } = args;

  await updatePnpmCatalog({
    filePath: path,
    exclude,
    include: addOnly ? [] : include,
    add,
    catalogs,
    noMainCatalog: !mainCatalog,
  });

  if (args.install) {
    spawnSync(`pnpm install`, {
      shell: true,
      stdio: "inherit",
    });
  }
}
