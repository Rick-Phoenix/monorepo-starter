import { log } from "@clack/prompts";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import pacote from "pacote";
import { tryThrow } from "../error_handling/error_handling.js";
import {
  type FsPromisesInstance,
  readPkgJson,
  writeJsonFile,
} from "../fs/fs_json.js";
import { readPnpmWorkspace, writeYamlFile } from "../fs/fs_yaml.js";

export async function getLatestVersionRange(pkgName: string) {
  const manifest = await tryThrow(
    pacote.manifest(pkgName),
    `getting the latest version for ${pkgName}`,
  );

  return `^${manifest.version}`;
}

export interface InstallCatalogPackagesOpts {
  packages: string[];
  packageJson?: string;
  pnpmWorkspacePath: string;
  dev?: boolean;
  fs?: FsPromisesInstance;
}

export async function installCatalogPackages(opts: InstallCatalogPackagesOpts) {
  const { packages, pnpmWorkspacePath, dev } = opts;
  const fsInstance = opts.fs || fs;
  const packageJsonPath = resolve(opts.packageJson || "package.json");
  const packageJson = await readPkgJson({
    fs: fsInstance,
    filePath: packageJsonPath,
  });

  const pnpmWorkspace = await readPnpmWorkspace({
    fs: fsInstance,
    filePath: pnpmWorkspacePath,
  });

  packageJson.devDependencies = packageJson.devDependencies || {};
  packageJson.dependencies = packageJson.dependencies || {};
  pnpmWorkspace.catalog = pnpmWorkspace.catalog || {};

  for (const pkg of packages) {
    const packageVersion = await getLatestVersionRange(pkg);
    if (dev) {
      packageJson.devDependencies[pkg] = "catalog:";
    } else {
      packageJson.dependencies[pkg] = "catalog:";
    }

    pnpmWorkspace.catalog[pkg] = packageVersion;
  }

  await writeYamlFile(pnpmWorkspacePath, pnpmWorkspace, { fs: fsInstance });
  await writeJsonFile(packageJsonPath, packageJson, { fs: fsInstance });

  log.success(
    `Added ${packages.length} to package.json and to the pnpm catalog.`,
  );
}
export interface UpdatePnpmCatalogOpts {
  filePath: string;
  exclude?: string[];
  include?: string[];
  add?: string[];
  catalogs?: string[] | "all";
  noMainCatalog?: boolean;
  fs?: FsPromisesInstance;
}

export async function updatePnpmCatalog(opts: UpdatePnpmCatalogOpts) {
  const { exclude, include, add, noMainCatalog } = opts;

  if (exclude && include) {
    throw new Error("Can only choose one between exclude and include.");
  }

  const fsInstance = opts.fs || fs;
  const filePath = resolve(opts.filePath);

  const pnpmWorkspace = await readPnpmWorkspace({ filePath, fs: fsInstance });

  if (!pnpmWorkspace || !pnpmWorkspace.catalog) {
    throw new Error(
      "Could not read the catalog entry in the pnpm-workspace file.",
    );
  }

  const checkedPackages = new Map<string, string>();
  let updatedPackages = 0;
  let addedPackages = 0;

  async function updateVersions(catalog: Record<string, string>) {
    const entries = Object.keys(
      catalog,
    );

    for (const entry of entries) {
      if (
        (!exclude && !include) ||
        (exclude && !exclude.includes(entry)) ||
        (include && include.includes(entry))
      ) {
        if (!checkedPackages.get(entry)) {
          const latestVersion = await getLatestVersionRange(entry);
          checkedPackages.set(entry, latestVersion);
          if (latestVersion !== catalog[entry]) updatedPackages++;
        }
        catalog[entry] = checkedPackages.get(entry)!;
      }
    }

    return catalog;
  }

  if (!noMainCatalog) {
    pnpmWorkspace.catalog = await updateVersions(pnpmWorkspace.catalog);
  }

  if (add) {
    for (const newPkg of add) {
      if (pnpmWorkspace.catalog[newPkg]) {
        log.warn(`Skipping ${newPkg} as it is already in the catalog.`);
        continue;
      }
      pnpmWorkspace.catalog[newPkg] = await getLatestVersionRange(newPkg);
      addedPackages++;
    }
  }

  if (opts.catalogs) {
    const catalogs = pnpmWorkspace.catalogs;
    for (const [catalogName, catalogEntries] of Object.entries(catalogs)) {
      if (opts.catalogs === "all" || opts.catalogs.includes(catalogName)) {
        catalogs[catalogName] = await updateVersions(catalogEntries);
      }
    }
  }

  await writeYamlFile(filePath, pnpmWorkspace, { fs: fsInstance });

  log.success(
    `Updated ${updatedPackages} entr${
      updatedPackages !== 1 ? "ies" : "y"
    } in the catalog.`,
  );
  if (add) {
    log.success(
      `Added ${addedPackages} entr${
        addedPackages !== 1 ? "ies" : "y"
      } to the catalog.`,
    );
  }
}
