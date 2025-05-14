import type { Volume } from "memfs";
import { createFsFromVolume } from "memfs";
import { resolve } from "node:path";
import type { PackageJson } from "type-fest";
import { tryThrow } from "../error_handling/error_handling.js";
import type { FindUpOpts } from "../fs/find.js";
import { findUp } from "../fs/find.js";
import type { FindPkgJsonOpts, ReadPkgJsonOpts } from "../fs/fs_json.js";

export function createMemfsHandlers(vol: Volume) {
  const volFs = createFsFromVolume(vol);
  const readPkgJson = async <T = Record<string, unknown>>(
    opts?: Omit<ReadPkgJsonOpts, "fs">,
  ) => {
    const filePath = opts?.filePath ||
      resolve(opts?.cwd || process.cwd(), "package.json");
    const fsInstance = volFs.promises;
    const rawText = await fsInstance.readFile(filePath, "utf8") as string;

    return JSON.parse(rawText) as PackageJson & T;
  };

  const writeJsonFile = async (
    outPath: string,
    content: unknown,
  ) => {
    const jsonText = JSON.stringify(content, null, 2);
    const fsInstance = volFs.promises;
    await tryThrow(
      fsInstance.writeFile(outPath, jsonText),
      `writing the json file at '${outPath}'`,
    );
  };

  const findUpWrapper = async (opts: Omit<FindUpOpts, "fs">) => {
    //@ts-expect-error Missing property "glob" is not used so it is safe
    return findUp({ ...opts, fs: volFs.promises });
  };

  const findPkgJson = async <T = Record<string, unknown>>(
    opts: Omit<FindPkgJsonOpts, "fs">,
  ) => {
    const limit = opts.limit || 3;

    const packageJsonPath = await tryThrow(
      //@ts-expect-error Missing property "glob" is not used so it is safe
      findUp({ ...opts, limit, name: "package.json", fs: volFs.promises }),
    );

    const packageJson = await tryThrow(
      readPkgJson<T>({ filePath: packageJsonPath }),
      `reading the package.json file at ${packageJsonPath}`,
    );

    return [packageJson, packageJsonPath] as const;
  };

  return {
    findPkgJson,
    readPkgJson,
    writeJsonFile,
    findUp: findUpWrapper,
  };
}
