import { select } from "@clack/prompts";
import fg, { type Options } from "fast-glob";
import fs, { constants } from "node:fs/promises";
import { stringType } from "./arktype.js";
import { handleUnknownError, tryCatch } from "./error_handling.js";
import {
  isENOENTError,
  isNodeError,
  isPermissionError,
} from "./type_checking.js";

export async function assertDirExists(path: string) {
  const { exists, isDirectory } = await getFileInfo(path);
  if (!exists) {
    throw new Error(`${path} is not a valid directory (does not exist)`);
  } else if (!isDirectory) {
    throw new Error(`${path} is not a valid directory (it is not a directory)`);
  }

  return path;
}

export async function assertFileExists(path: string) {
  const { exists, isDirectory } = await getFileInfo(path);
  if (!exists) {
    throw new Error(`${path} is not a file (does not exist)`);
  } else if (isDirectory) {
    throw new Error(`${path} is not a file (it is a directory)`);
  }

  return path;
}

export async function assertDirIsEmpty(path: string) {
  const { exists, isDirectory, isEmpty } = await getFileInfo(path);
  if (!exists) {
    throw new Error(`${path} is not an empty directory (does not exist)`);
  } else if (!isDirectory) {
    throw new Error(
      `${path} is not an empty directory (it is not a directory)`,
    );
  } else if (!isEmpty) {
    throw new Error(`${path} is not an empty directory`);
  }

  return path;
}

interface FileInfo {
  exists: boolean;
  isDirectory: boolean;
  isEmpty: boolean | null; // null if not a directory or doesn't exist
  isWritable: boolean | null; // null if doesn't exist, false if exists but not writable
  isReadable: boolean | null;
  error: Error | NodeJS.ErrnoException | null; // Optional error message for non-ENOENT/EACCES issues
}

export async function getFileInfo(
  filePath: string,
): Promise<FileInfo> {
  const info: FileInfo = {
    exists: false,
    isDirectory: false,
    isEmpty: null,
    isWritable: null,
    isReadable: null,
    error: null,
  };

  try {
    const stats = await fs.stat(filePath);

    info.exists = true;
    info.isReadable = true;

    if (!stats.isDirectory()) {
      return info;
    }

    info.isDirectory = stats.isDirectory();
  } catch (error: any) {
    if (isENOENTError(error)) {
      // Dir does not exist
    } else if (isNodeError(error)) {
      info.error = error;
    } else {
      info.error = handleUnknownError(error);
    }
  }

  if (info.isReadable && info.isDirectory) {
    const [dirContent, error] = await tryCatch(
      fs.readdir(filePath),
      `checking the contents of ${filePath}`,
    );

    if (error) {
      info.error = error;
      return info;
    } else {
      info.isEmpty = dirContent.length === 0;
    }
  }

  const [_, writeAccessError] = await tryCatch(
    fs.access(filePath, constants.W_OK),
  );

  if (writeAccessError) {
    if (!isPermissionError(writeAccessError)) {
      info.error = writeAccessError;
    }
  } else {
    info.isWritable = true;
  }

  return info;
}

export async function isDir(path: string) {
  const { isDirectory } = await getFileInfo(path);
  return isDirectory;
}

export async function isEmptyDir(path: string) {
  const { isDirectory, isEmpty } = await getFileInfo(path);
  return isDirectory && isEmpty;
}

export async function isEmptyWritableDir(path: string) {
  const { isDirectory, isEmpty, isWritable } = await getFileInfo(path);
  return isDirectory && isEmpty && isWritable;
}

export async function isWritableDir(path: string) {
  const { isDirectory, isWritable } = await getFileInfo(path);
  return isDirectory && isWritable;
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
