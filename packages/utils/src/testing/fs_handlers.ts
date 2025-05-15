import type { Volume } from "memfs";
import { createFsFromVolume } from "memfs";
import type { FindUpOpts } from "../fs/find.js";
import { findUp } from "../fs/find.js";
import {
  findPkgJson,
  type FindPkgJsonOpts,
  type FsPromisesInstance,
  readPkgJson,
  type ReadPkgJsonOpts,
  writeJsonFile,
} from "../fs/fs_json.js";
import type {
  RecursiveRenderOptions,
  WriteRenderOptions,
} from "../rendering.js";
import { recursiveRender, writeRender } from "../rendering.js";

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
    return findUp({ ...opts, fs: volFsPromises });
  };

  const findPkgJsonWrapper = async <T = Record<string, unknown>>(
    opts: Omit<FindPkgJsonOpts, "fs">,
  ) => {
    return findPkgJson<T>({ ...opts, fs: volFsPromises });
  };

  return {
    findPkgJson: findPkgJsonWrapper,
    readPkgJson: readPkgJsonWrapper,
    writeJsonFile: writeJsonFileWrapper,
    findUp: findUpWrapper,
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
