import fs from "node:fs/promises";
import { resolve } from "node:path";
import type { PackageJson } from "type-fest";
import { tryThrow } from "./error_handling.js";
import { findUp } from "./find.js";

export type FsInstance = typeof import("node:fs/promises");

export interface ReadPkgJsonOpts {
  cwd?: string;
  fs?: FsInstance;
  filePath?: string;
}

export async function readPkgJson<T = Record<string, unknown>>(
  opts?: ReadPkgJsonOpts,
) {
  const filePath = opts?.filePath ||
    resolve(opts?.cwd || process.cwd(), "package.json");
  const fsInstance = opts?.fs || fs;
  const rawText = await fsInstance.readFile(filePath, "utf8");

  return JSON.parse(rawText) as PackageJson & T;
}

export type WriteJsonOpts = Parameters<typeof writeJsonFile>;

export async function writeJsonFile(
  outPath: string,
  content: unknown,
  opts?: { fs?: FsInstance },
) {
  const jsonText = JSON.stringify(content, null, 2);
  const fsInstance = opts?.fs || fs;
  await tryThrow(
    fsInstance.writeFile(outPath, jsonText, "utf8"),
    `writing the json file at '${outPath}'`,
  );
}

export interface FindPkgJsonOpts {
  startDir?: string;
  limit?: number;
  fs?: FsInstance;
  dirMarker?: string;
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
