import { select } from "@clack/prompts";
import fg, { type Options } from "fast-glob";
import fs, { access, constants } from "node:fs/promises";
import { basename } from "node:path";
import { stringType } from "./arktype.js";
import { assertErrorWithMsg, assertIsObject } from "./checks.js";
import { tryCatch, tryThrow } from "./error-handling.js";

export async function assertPath(path: string) {
  const baseName = basename(path);
  await tryThrow(
    access(path, constants.F_OK),
    `checking the path for ${baseName} (input was ${path})`,
  );
}

interface DirectoryStatus {
  exists: boolean;
  isDirectory: boolean;
  isEmpty: boolean | null; // null if not a directory or doesn't exist
  isWritable: boolean | null; // null if doesn't exist, false if exists but not writable
  error?: string; // Optional error message for non-ENOENT/EACCES issues
}

/**
 * Checks the status of a directory path: existence, type, emptiness, and writability.
 * @param dirPath The path to the directory to check.
 * @returns A promise resolving to a DirectoryStatus object.
 */
export async function checkDirectoryStatus(
  dirPath: string,
): Promise<DirectoryStatus> {
  const status: DirectoryStatus = {
    exists: false,
    isDirectory: false,
    isEmpty: null,
    isWritable: null,
  };

  try {
    const stats = await fs.stat(dirPath);

    status.exists = true;

    if (!stats.isDirectory()) {
      return status;
    }

    status.isDirectory = true;
  } catch (error: any) {
    if (assertIsObject(error) && error?.code === "ENOENT") {
      // Dir does not exist
    } else {
      console.error(`Error getting stats for ${dirPath}:`, error);
      status.error = `Stat failed: ${
        assertErrorWithMsg(error) ? error.message : "Unknown Error"
      }`;
    }

    return status;
  }

  const [dirContent, error] = await tryCatch(
    fs.readdir(dirPath),
    `checking the contents of ${dirPath}`,
  );

  if (error) {
    status.error = error.message;
    return status;
  } else {
    status.isEmpty = dirContent.length === 0;
  }

  const [_, accessError] = await tryCatch(
    fs.access(dirPath, constants.W_OK),
    `checking permissions for ${dirPath}`,
  );

  if (!accessError) status.isWritable = true;

  return status;
}

export async function findPaths<T extends readonly string[]>(
  paths: T,
  options?: Options & { excludedDirs?: string[]; includeNodeModules?: boolean },
): Promise<Record<T[number], string>> {
  type PathKeys = typeof paths[number];

  const pathsInitial: { [key: string]: string } = {};

  const { excludedDirs = [], includeNodeModules, ...fgOpts } = options ?? {};

  const fgExcludes = excludedDirs.map((d) => `!**/${d}`);

  if (!includeNodeModules && !excludedDirs.includes("node_modules")) {
    fgExcludes.push("!**/node_modules");
  }

  const defaults = {
    absolute: true,
  };

  for (const path of paths) {
    const entries = await fg([
      `**/${path}`,
      ...fgExcludes,
    ], { ...defaults, ...fgOpts });

    if (!entries.length) {
      throw new Error(
        `Could not find any matches for the directory '${path}'.`,
      );
    }

    let dirPath: string | undefined;

    if (entries.length > 1) {
      const choice = await select({
        message:
          `Found ${entries.length} matches for the directory '${path}'. Choose the correct one.`,
        options: [
          ...entries.map((entry) => ({
            value: entry,
            label: entry,
          })),
          { value: "exit", label: "Exit the script" },
        ],
      });

      if (typeof choice !== "string" || choice === "exit") {
        // eslint-disable-next-line no-console
        console.log("Operation cancelled.");
        process.exit(1);
      }

      dirPath = stringType.assert(choice);
    } else {
      dirPath = stringType.assert(entries[0]);
    }

    pathsInitial[path] = dirPath;
  }

  type PathsOutput = { [K in PathKeys]: string };
  const pathsFinal: PathsOutput = pathsInitial as PathsOutput;

  return pathsFinal;
}

export async function findDirectories<T extends readonly string[]>(
  paths: T,
  options?: Options & { excludedDirs?: string[]; includeNodeModules?: boolean },
) {
  return findPaths(paths, { ...options, onlyDirectories: true });
}

export async function findFiles<T extends readonly string[]>(
  paths: T,
  options?: Options & { excludedDirs?: string[]; includeNodeModules?: boolean },
) {
  return findPaths(paths, { ...options, onlyFiles: true });
}
