import { log } from "@clack/prompts";
import fs from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import YAML from "yaml";
import { tryThrow } from "../error_handling/error_handling.js";
import { getLatestVersionRange } from "../npm/npm.js";
import { findUp } from "./find.js";
import type { FsPromisesInstance } from "./fs_json.js";

export interface ReadYamlFileOpts {
  filePath: string;
  fs?: FsPromisesInstance;
}

export async function readYamlFile<T = Record<string, unknown>>(
  opts: ReadYamlFileOpts,
) {
  const { filePath } = opts;
  const fsInstance = opts?.fs || fs;

  const rawText = await tryThrow(
    fsInstance.readFile(resolve(filePath), "utf8"),
    `reading ${filePath}`,
  );
  const parsedYaml = await tryThrow(
    // eslint-disable-next-line ts/no-unsafe-argument
    YAML.parse(rawText),
    `parsing the yaml in ${basename(filePath)}`,
  );

  return parsedYaml as T;
}

export type WriteYamlFileOpts = Parameters<typeof writeYamlFile>;

export async function writeYamlFile(
  outPath: string,
  content: unknown,
  opts?: { fs?: FsPromisesInstance },
) {
  const yamlText = YAML.stringify(content, null, 2);
  const fsInstance = opts?.fs || fs;
  const resolvedPath = resolve(outPath);
  await fsInstance.mkdir(dirname(resolvedPath), { recursive: true });
  await tryThrow(
    fsInstance.writeFile(outPath, yamlText, "utf8"),
    `writing the yaml file at '${outPath}'`,
  );
}

export interface ReadPnpmWorkspaceOpts {
  cwd?: string;
  fs?: FsPromisesInstance;
  filePath?: string;
}

export interface PnpmWorkspace {
  packages: string[];
  catalog: Record<string, string>;
  catalogs: Record<string, Record<string, string>>;
}

export async function readPnpmWorkspace<T = Record<string, unknown>>(
  opts?: ReadPnpmWorkspaceOpts,
) {
  const filePath = opts?.filePath ||
    resolve(opts?.cwd || process.cwd(), "pnpm-workspace.yaml");
  const fsInstance = opts?.fs || fs;
  const pnpmWorkspace = await readYamlFile<PnpmWorkspace & T>({
    filePath,
    fs: fsInstance,
  });

  return pnpmWorkspace;
}

export interface FindPnpmWorkspaceOpts {
  startDir?: string;
  limit?: number;
  fs?: FsPromisesInstance;
  dirMarker?: string;
  excludeDirs?: string[];
}

export async function findPnpmWorkspace<T = Record<string, unknown>>(
  opts: FindPnpmWorkspaceOpts,
) {
  const limit = opts.limit || 3;

  const fsInstance = opts?.fs || fs;

  const pnpmWorkspacePath = await tryThrow(
    findUp({ ...opts, fs: fsInstance, limit, name: "pnpm-workspace.yaml" }),
  );

  const pnpmWorkspace = await tryThrow(
    readPnpmWorkspace<T>({ filePath: pnpmWorkspacePath, fs: opts.fs }),
    `reading the pnpm-workspace file at ${pnpmWorkspacePath}`,
  );

  return [pnpmWorkspace, pnpmWorkspacePath] as const;
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
