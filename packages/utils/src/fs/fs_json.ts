import fs from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import type { PackageJson } from "type-fest";
import { tryThrow } from "../error_handling/error_handling.js";
import { findUp } from "./find.js";

export type FsPromisesInstance = typeof import("node:fs/promises");
export type FsInstance = typeof import("node:fs");

export interface ReadPkgJsonOpts {
  cwd?: string;
  fs?: FsPromisesInstance;
  filePath?: string;
}

export async function readPkgJson<T = Record<string, unknown>>(
  opts?: ReadPkgJsonOpts,
) {
  const filePath = opts?.filePath ||
    resolve(opts?.cwd || process.cwd(), "package.json");
  const fsInstance = opts?.fs || fs;
  const packageJson = await readJsonFile<PackageJson & T>({
    filePath,
    fs: fsInstance,
  });

  return packageJson;
}

export interface ReadJsonFileOpts {
  filePath: string;
  fs?: FsPromisesInstance;
}

export async function readJsonFile<T = Record<string, unknown>>(
  opts: ReadJsonFileOpts,
) {
  const { filePath } = opts;
  const fsInstance = opts?.fs || fs;

  const rawText = await tryThrow(
    fsInstance.readFile(filePath, "utf8"),
    `reading ${filePath}`,
  );
  const parsedJson = await tryThrow(
    // eslint-disable-next-line ts/no-unsafe-argument
    JSON.parse(rawText),
    `parsing the json in ${basename(filePath)}`,
  );

  return parsedJson as T;
}

export type WriteJsonOpts = Parameters<typeof writeJsonFile>;

export async function writeJsonFile(
  outPath: string,
  content: unknown,
  opts?: { fs?: FsPromisesInstance },
) {
  const jsonText = JSON.stringify(content, null, 2);
  const fsInstance = opts?.fs || fs;
  await fsInstance.mkdir(dirname(outPath), { recursive: true });
  await tryThrow(
    fsInstance.writeFile(outPath, jsonText, "utf8"),
    `writing the json file at '${outPath}'`,
  );
}

export interface FindPkgJsonOpts {
  startDir?: string;
  limit?: number;
  fs?: FsPromisesInstance;
  dirMarker?: string;
  excludeDirs?: string[];
}

export async function findPkgJson<T = Record<string, unknown>>(
  opts: FindPkgJsonOpts,
) {
  const limit = opts.limit || 3;

  const fsInstance = opts?.fs || fs;

  const packageJsonPath = await tryThrow(
    findUp({ ...opts, fs: fsInstance, limit, name: "package.json" }),
  );

  const packageJson = await tryThrow(
    readPkgJson<T>({ filePath: packageJsonPath, fs: opts.fs }),
    `reading the package.json file at ${packageJsonPath}`,
  );

  return [packageJson, packageJsonPath] as const;
}
