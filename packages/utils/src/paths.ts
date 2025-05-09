import { cancel } from "@clack/prompts";
import fg, { type Options } from "fast-glob";
import fs, { constants, rm } from "node:fs/promises";
import { basename } from "node:path";
import { stringType } from "./arktype.js";
import { throwErr, tryCatch } from "./error_handling.js";
import { confirm, select } from "./prompts.js";
import {
  isENOENTError,
  isENOTDIRError,
  isPermissionError,
} from "./type_checking.js";

export async function assertReadableWritableFile(path: string) {
  const { exists, isFile, isReadable, isWritable } = await getFileInfo(path);
  const errBase = `the file at ${path} `;
  if (!exists) {
    throwErr(errBase.concat("does not exist."));
  } else if (!isFile) {
    throwErr(errBase.concat("is a file, not a directory."));
  } else if (!isReadable) {
    throwErr(errBase.concat("is not readable by this process."));
  } else if (!isWritable) {
    throwErr(errBase.concat("is not writable by this process."));
  } else {
    return path;
  }
}

export async function assertReadableFile(path: string) {
  const { isReadable, isFile, exists } = await getFileInfo(path);
  if (!exists) {
    throw new Error(`file '${path}' does not exist.`);
  } else if (!isFile) {
    throw new Error(`the item at ${path} is a directory and not a file.`);
  } else if (!isReadable) {
    throw new Error(`file ${path} is not readable by this process.`);
  } else {
    return path;
  }
}

export async function assertWritableDir(path: string) {
  const { exists, isDirectory, isExecutable, isWritable } = await getFileInfo(
    path,
  );
  if (!exists) {
    throw new Error(`directory '${path}' does not exist.`);
  } else if (!isDirectory) {
    throwErr(`the item at ${path} is a file and not a directory.`);
  } else if (!isWritable || !isExecutable) {
    throwErr(`cannot write to directory ${path}.`);
  } else {
    return path;
  }
}

export async function assertEmptyDir(path: string) {
  const { exists, isDirectory, isEmpty, isReadable } = await getFileInfo(path);
  if (!exists) {
    throw new Error(`${path} is not a directory (does not exist).`);
  } else if (!isDirectory) {
    throw new Error(
      `${path} is not a directory.`,
    );
  } else if (!isReadable) {
    throwErr(`cannot read the contents of directory ${path}.`);
  } else if (!isEmpty) {
    throw new Error(`${path} is not an empty directory`);
  }

  return path;
}

export async function assertEmptyWritableDir(path: string) {
  const { exists, isDirectory, isEmpty, isReadable, isWritable, isExecutable } =
    await getFileInfo(path);
  if (!exists) {
    throw new Error(`${path} is not a directory (does not exist).`);
  } else if (!isDirectory) {
    throw new Error(
      `${path} is not a directory.`,
    );
  } else if (!isReadable) {
    throwErr(`cannot read the contents of directory ${path}.`);
  } else if (!isEmpty) {
    throw new Error(`${path} is not an empty directory`);
  } else if (!isExecutable || !isWritable) {
    throwErr(`this process cannot write to directory ${path}.`);
  }

  return path;
}

interface FileInfo {
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  isEmpty: boolean | null; // null if not a directory or doesn't exist
  isWritable: boolean;
  isReadable: boolean;
  isExecutable: boolean;
  error: Error | NodeJS.ErrnoException | null; // Optional error message for non-ENOENT/EACCES issues
}

export async function getFileInfo(
  filePath: string,
): Promise<FileInfo> {
  const info: FileInfo = {
    exists: false,
    isDirectory: false,
    isFile: false,
    isEmpty: null,
    isWritable: false,
    isReadable: false,
    isExecutable: false,
    error: null,
  };

  const [files, readDirError] = await tryCatch(
    fs.readdir(filePath),
    `reading the contents of the file at ${filePath}`,
  );

  if (readDirError) {
    if (isENOENTError(readDirError)) {
      return info;
    } else if (isPermissionError(readDirError)) {
      info.exists = true;
      info.isDirectory = true;
    } else if (isENOTDIRError(readDirError)) {
      info.exists = true;
      info.isFile = true;
    }
  } else {
    info.exists = true;
    info.isDirectory = true;
    info.isReadable = true;
    info.isExecutable = true;
    info.isEmpty = files.length === 0;
  }

  if (info.isFile) {
    const [_, readFileError] = await tryCatch(
      fs.access(filePath, constants.R_OK),
      `reading the file at ${filePath}`,
    );

    if (!readFileError) {
      info.isReadable = true;
    }

    const [__, executeCheckError] = await tryCatch(
      fs.access(filePath, constants.X_OK),
      `reading the file at ${filePath}`,
    );

    if (!executeCheckError) {
      info.isExecutable = true;
    }
  }

  const [_, writeAccessError] = await tryCatch(
    fs.access(filePath, constants.W_OK),
    `checking write permissions for the file at ${filePath}`,
  );

  if (!writeAccessError) {
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
  const { isDirectory, isEmpty, isWritable, isExecutable } = await getFileInfo(
    path,
  );
  return isDirectory && isEmpty && isWritable && isExecutable;
}

export async function isWritableDir(path: string) {
  const { isDirectory, isWritable, isExecutable } = await getFileInfo(path);
  return isDirectory && isWritable && isExecutable;
}

export async function isFile(path: string) {
  const { isFile } = await getFileInfo(path);
  return isFile;
}

export async function isReadableFile(path: string) {
  const { isFile, isReadable } = await getFileInfo(path);
  return isFile && isReadable;
}

export async function isWritableFile(path: string) {
  const { isFile, isWritable } = await getFileInfo(path);
  return isFile && isWritable;
}

export async function isExecutableFile(path: string) {
  const { isFile, isExecutable } = await getFileInfo(path);
  return isFile && isExecutable;
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

export async function promptIfDirNotEmpty(path: string) {
  const { isExecutable, isWritable, isDirectory, isReadable, isEmpty } =
    await getFileInfo(path);

  if (isDirectory) {
    //
    if (!isReadable) {
      throwErr(`The directory at ${path} already exists is not readable.`);
    } else if (!isWritable || !isExecutable) {
      throwErr(
        `This process is not allowed to write to directory ${path}.`,
      );
    }

    if (!isEmpty) {
      const removeDir = await confirm({
        message: `⚠️ The directory at ${
          basename(path)
        } already exists. Do you want to overwrite it? ⚠️`,
        initialValue: false,
      });

      if (removeDir) {
        await rm(path, { recursive: true, force: true });
        return true;
      } else {
        cancel("Operation aborted.");
        return false;
      }
    } else {
      return true;
    }
  } else {
    return true;
  }
}

export async function promptIfFileExists(path: string) {
  const { isFile, exists } = await getFileInfo(path);
  if (exists && isFile) {
    const removeFile = await confirm({
      message: `⚠️ The file ${
        basename(path)
      } already exists. Do you want to overwrite it? ⚠️`,
      initialValue: false,
    });

    if (removeFile) {
      const [_, error] = await tryCatch(
        rm(path, { force: true }),
        `deleting ${path}`,
      );
      if (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        process.exit(1);
      } else {
        return true;
      }
    } else {
      cancel("Operation aborted.");
      process.exit(0);
    }
    //
  } else {
    return true;
  }
}
