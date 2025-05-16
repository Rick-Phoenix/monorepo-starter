import { Command } from "@commander-js/extra-typings";
import { installCatalogPackages } from "@monorepo-starter/utils";
import { spawnSync } from "node:child_process";

export async function installCatalogPackagesCli(injectedArgs?: string[]) {
  const program = new Command()
    .requiredOption("-p, --packages <packages...>", "The packages to install")
    .requiredOption(
      "-w, --workspace-file <path>",
      "The path to the pnpm-workspace file",
    )
    .option(
      "-j, --package-json <path>",
      "The path to the package.json file",
      "package.json",
    )
    .option(
      "-i, --install",
      "Run 'pnpm install' after adding the packages",
      true,
    );

  if (injectedArgs) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const args = program.opts();

  const { packageJson, workspaceFile: pnpmWorkspacePath, packages, install } =
    args;

  await installCatalogPackages({
    pnpmWorkspacePath,
    packageJson,
    packages,
  });

  if (install) {
    spawnSync("pnpm install", {
      shell: true,
      stdio: "inherit",
    });
  }
}
