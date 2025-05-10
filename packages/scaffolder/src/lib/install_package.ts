import { spawnSync } from "node:child_process";

export const packageManagers = ["pnpm", "bun"] as const;
export type PackageManager = typeof packageManagers[number];

export function installPackages(
  packages: string | string[],
  pkgManager: PackageManager,
  dev?: boolean,
) {
  const command = getInstallPackagesCommand(packages, pkgManager, dev);

  const { error } = spawnSync(command, {
    shell: true,
    stdio: "inherit",
  });

  return !error;
}

export function getInstallPackagesCommand(
  packages: string | string[],
  pkgManager: PackageManager,
  dev?: boolean,
) {
  const command = `${pkgManager} install ${dev ? "-D" : ""} ${
    typeof packages === "string" ? packages : packages.join(" ")
  }`;

  return command;
}
