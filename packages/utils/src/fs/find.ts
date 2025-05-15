import fs from "node:fs/promises";
import { resolve } from "node:path";
import { tryThrow } from "../error_handling/error_handling.js";
import type { FsPromisesInstance } from "./fs_json.js";

export interface FindUpOpts {
  startDir?: string;
  limit?: number;
  fs?: FsPromisesInstance;
  currentIteration?: number;
  pathsSearched?: string[];
  fileMarker?: string;
  dirMarker?: string;
  type?: "file" | "directory";
  name: string;
}

export async function findUp(
  opts: FindUpOpts,
) {
  const currentPath = opts.startDir || process.cwd();
  const type = opts.type || "file";
  const limit = opts.limit || 5;
  const currentIteration = opts.currentIteration || 0;
  const pathsSearched = opts.pathsSearched || [];

  if (type === "directory" && currentPath === opts.name) {
    return currentPath;
  }

  if (currentIteration >= limit) {
    throw new Error(
      `Could not find '${opts.name}' after searching in these directories: [${
        pathsSearched.join(", ")
      }]`,
    );
  }

  const fsInstance = opts?.fs || fs;
  const dirContent = await tryThrow(
    fsInstance.readdir(currentPath, { withFileTypes: true }),
    `reading the contents of '${currentPath}'`,
  );

  for (const content of dirContent) {
    if (
      (type === "file" && content.isFile()) ||
      (type === "directory" && content.isDirectory())
    ) {
      if (content.name === opts.name) {
        return resolve(content.parentPath, content.name);
      }
    } else if (type === "directory" && (opts.fileMarker || opts.dirMarker)) {
      if (
        (content.name === opts.fileMarker && content.isFile()) ||
        content.name === opts.dirMarker && content.isDirectory()
      ) {
        return resolve(content.parentPath);
      }
    }
  }

  pathsSearched.push(currentPath);
  const newPath = resolve(currentPath, "..");
  return findUp({
    startDir: newPath,
    limit,
    currentIteration: currentIteration + 1,
    fs: opts.fs,
    pathsSearched,
    name: opts.name,
    type,
  });
}
