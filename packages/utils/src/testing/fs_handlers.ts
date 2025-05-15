import type { Volume } from "memfs";
import { createFsFromVolume } from "memfs";
import { join } from "node:path";
import { throwErr } from "../error_handling/error_handling.js";
import type { FindUpOpts } from "../fs/find.js";
import { findUp } from "../fs/find.js";
import {
  findPkgJson,
  type FindPkgJsonOpts,
  type FsPromisesInstance,
  readJsonFile,
  type ReadJsonFileOpts,
  readPkgJson,
  type ReadPkgJsonOpts,
  writeJsonFile,
} from "../fs/fs_json.js";
import {
  findPnpmWorkspace,
  type FindPnpmWorkspaceOpts,
  readPnpmWorkspace,
  type ReadPnpmWorkspaceOpts,
  readYamlFile,
  type ReadYamlFileOpts,
  writeYamlFile,
} from "../fs/fs_yaml.js";
import type {
  RecursiveRenderOptions,
  WriteRenderOptions,
} from "../rendering.js";
import { recursiveRender, writeRender } from "../rendering.js";

export interface RecursiveCopyToMemfsOpts {
  fs: typeof import("node:fs");
  vol: Volume;
  sourceDirOnDisk: string;
  targetDirInMemfs: string;
}

export function copyDirectoryToMemfs(
  opts: RecursiveCopyToMemfsOpts,
): void {
  const { fs: fs_disk, vol: memfsInstance, sourceDirOnDisk, targetDirInMemfs } =
    opts;
  if (!fs_disk.existsSync(sourceDirOnDisk)) {
    throwErr(`Source directory NOT FOUND on disk: ${sourceDirOnDisk}`);
  }
  if (!fs_disk.statSync(sourceDirOnDisk).isDirectory()) {
    throwErr(`Source directory is not a directory: ${sourceDirOnDisk}`);
  }

  memfsInstance.mkdirSync(targetDirInMemfs, { recursive: true });

  const entries = fs_disk.readdirSync(sourceDirOnDisk, { withFileTypes: true });

  for (const entry of entries) {
    const currentSourcePath = join(sourceDirOnDisk, entry.name);
    const currentTargetPathInMemfs = join(
      targetDirInMemfs,
      entry.name,
    );

    if (entry.isDirectory()) {
      copyDirectoryToMemfs({
        ...opts,
        sourceDirOnDisk: currentSourcePath,
        targetDirInMemfs: currentTargetPathInMemfs,
      });
    } else if (entry.isFile()) {
      const fileContent = fs_disk.readFileSync(currentSourcePath);
      memfsInstance.writeFileSync(
        currentTargetPathInMemfs,
        fileContent,
      );
    }
  }
}

export function createMemfsHandlers(vol: Volume) {
  // Safe as long as missing methods like glob are not used
  const volFsPromises = createFsFromVolume(vol)
    .promises as unknown as FsPromisesInstance;
  const readPkgJsonWrapper = async <T = Record<string, unknown>>(
    opts?: Omit<ReadPkgJsonOpts, "fs">,
  ) => {
    return readPkgJson<T>({ ...opts, fs: volFsPromises });
  };

  const writeJsonFileWrapper = async (
    outPath: string,
    content: unknown,
  ) => {
    return writeJsonFile(outPath, content, { fs: volFsPromises });
  };

  const findUpWrapper = async (opts: Omit<FindUpOpts, "fs">) => {
    return findUp({ ...opts, fs: volFsPromises } as FindUpOpts);
  };

  const findPkgJsonWrapper = async <T = Record<string, unknown>>(
    opts: Omit<FindPkgJsonOpts, "fs">,
  ) => {
    return findPkgJson<T>({ ...opts, fs: volFsPromises });
  };

  const readJsonFileWrapper = async <T = Record<string, unknown>>(
    opts: Omit<ReadJsonFileOpts, "fs">,
  ) => {
    return readJsonFile<T>({ ...opts, fs: volFsPromises });
  };

  const writeYamlFileWrapper = async (opts: {
    outPath: string;
    content: unknown;
  }) => {
    return writeYamlFile(opts.outPath, opts.content, { fs: volFsPromises });
  };

  const readYamlFileWrapper = async <T = Record<string, unknown>>(
    opts: Omit<ReadYamlFileOpts, "fs">,
  ) => {
    return readYamlFile<T>({ ...opts, fs: volFsPromises });
  };

  const readPnpmWorkspaceWrapper = async <T = Record<string, unknown>>(
    opts: Omit<ReadPnpmWorkspaceOpts, "fs">,
  ) => {
    return readPnpmWorkspace<T>({ ...opts, fs: volFsPromises });
  };

  const findPnpmWorkspaceWrapper = async <T = Record<string, unknown>>(
    opts: Omit<FindPnpmWorkspaceOpts, "fs">,
  ) => {
    return findPnpmWorkspace<T>({ ...opts, fs: volFsPromises });
  };

  return {
    findPkgJson: findPkgJsonWrapper,
    readPkgJson: readPkgJsonWrapper,
    writeJsonFile: writeJsonFileWrapper,
    findUp: findUpWrapper,
    readJsonFile: readJsonFileWrapper,
    writeYamlFile: writeYamlFileWrapper,
    readYamlFile: readYamlFileWrapper,
    readPnpmWorkspace: readPnpmWorkspaceWrapper,
    findPnpmWorkspace: findPnpmWorkspaceWrapper,
  };
}

export function createMockedNunjucksHandlers(vol: Volume) {
  const fsInstance = createFsFromVolume(vol);
  return {
    writeRender: async (opts: Omit<WriteRenderOptions, "fs">) => {
      //@ts-expect-error Missing properties like glob are not used so it's safe
      return writeRender({ ...opts, fs: fsInstance });
    },
    recursiveRender: async (opts: Omit<RecursiveRenderOptions, "fs">) => {
      //@ts-expect-error Missing properties like glob are not used so it's safe
      return recursiveRender({ ...opts, fs: fsInstance });
    },
  };
}
