import fs from "node:fs/promises";
import { basename, resolve } from "node:path";
import { tryThrow } from "../error_handling/error_handling.js";
import type { FsPromisesInstance } from "./fs_json.js";

export type FindUpOpts =
  & {
    startDir?: string;
    limit?: number;
    fs?: FsPromisesInstance;
    currentIteration?: number;
    pathsSearched?: string[];
    dirMarker?: string;
    excludeDirs?: string[];
  }
  & (
    | { name: string; fileMarker?: never; type?: "file" }
    | {
      name?: string;
      fileMarker?: string;
      type?: "directory";
    }
  );

export async function findUp(
  opts: FindUpOpts,
) {
  const type = opts.type || "file";

  if (type === "directory" && !(opts.name || opts.fileMarker)) {
    throw new Error(
      "No name or file marker was given for the directory to find.",
    );
  }

  if (type === "file" && !opts.name) {
    throw new Error("No name was given for the file to find.");
  }

  const currentPath = opts.startDir || process.cwd();
  const limit = opts.limit || 5;
  const currentIteration = opts.currentIteration || 0;
  const pathsSearched = opts.pathsSearched || [];

  if (type === "directory" && currentPath === opts.name) {
    return currentPath;
  }

  if (currentIteration >= limit) {
    throw new Error(
      `Could not find ${
        opts.name
          ? `'${opts.name}'`
          : `a directory containing ${opts.fileMarker}`
      } after searching in these directories: [${pathsSearched.join(", ")}]`,
    );
  }

  const fsInstance = opts?.fs || fs;
  const dirContent = await tryThrow(
    fsInstance.readdir(currentPath, { withFileTypes: true }),
    `reading the contents of '${currentPath}'`,
  );

  const currentDirname = basename(currentPath);
  console.log("🔍🔍 currentDirname: 🔍🔍", currentDirname);

  if (
    (!opts.dirMarker ||
      currentDirname === opts.dirMarker) &&
    !opts.excludeDirs?.includes(currentDirname)
  ) {
    for (const content of dirContent) {
      if (
        (type === "file" && content.isFile()) ||
        (type === "directory" && content.isDirectory())
      ) {
        if (content.name === opts.name) {
          return resolve(content.parentPath, content.name);
        }
      } else if (type === "directory" && opts.fileMarker) {
        if (
          content.name === opts.fileMarker && content.isFile()
        ) {
          return resolve(content.parentPath);
        }
      }
    }

    pathsSearched.push(currentPath);
  }

  const newPath = resolve(currentPath, "..");
  return findUp({
    ...opts,
    startDir: newPath,
    currentIteration: currentIteration + 1,
  } as FindUpOpts);
}
