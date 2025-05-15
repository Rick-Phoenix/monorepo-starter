import fs from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import YAML from "yaml";
import { tryThrow } from "../error_handling/error_handling.js";
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
    fsInstance.readFile(filePath, "utf8"),
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
  await fsInstance.mkdir(dirname(outPath), { recursive: true });
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
