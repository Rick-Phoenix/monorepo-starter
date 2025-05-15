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
    .option("-c, --catalog <named_catalog...>", "The named catalogs to update")
    .option("--install", "Run 'pnpm install' after updating the catalog", true)
    .option(
      "-e, --exclude <package...>",
      "Do not update the version for specific packages (cannot be used with include)",
    )
    .addOption(
      new Option("--all", "Update all the named catalogs").implies({
        catalog: "all",
      }),
    )
    .option(
      "-i, --include <package...>",
      "Update the selected packages and exclude others by default (incompatible with exclude)",
    )
    .option(
      "-a, --add <package...>",
      "Add the selected packages to the catalog",
    );

  if (injectedArgs) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const args = program.opts();

  const { path, exclude, include, add, catalog, mainCatalog } = args;

  await updatePnpmCatalog({
    filePath: path,
    exclude,
    include,
    add,
    catalogs: catalog,
    noMainCatalog: !mainCatalog,
  });

  if (args.install) {
    spawnSync(`pnpm install`, {
      shell: true,
      stdio: "inherit",
    });
  }
}
