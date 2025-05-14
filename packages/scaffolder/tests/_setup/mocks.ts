import type FastGlob from "fast-glob";
import { fs as memFs, vol } from "memfs";
import fs from "node:fs";
import { vi } from "vitest";

vi.mock("fs", () => ({ ...memFs, default: memFs }));
vi.mock("fs/promises", () => ({ ...memFs.promises, default: memFs.promises }));
vi.mock("node:fs", () => ({ ...memFs, default: memFs }));
vi.mock(
  "node:fs/promises",
  () => ({ ...memFs.promises, default: memFs.promises }),
);

vi.mock("fast-glob", async () => {
  const actualFastGlob: {
    default: typeof import("fast-glob");
    sync: typeof import("fast-glob").sync;
  } = await vi
    .importActual(
      "fast-glob",
    );
  const mockedAsyncGlob = async (
    pattern: string | string[],
    options: FastGlob.Options = {},
  ) => {
    const optionsWithAdapter: FastGlob.Options = {
      ...options,
      fs,
    };
    return actualFastGlob.default(pattern, optionsWithAdapter);
  };

  const mockedSyncGlob = (
    pattern: string | string[],
    options: FastGlob.Options = {},
  ) => {
    const optionsWithAdapter: FastGlob.Options = {
      ...options,
      fs,
    };
    return actualFastGlob.sync(pattern, optionsWithAdapter);
  };

  return {
    ...actualFastGlob,
    default: mockedAsyncGlob,
    async: mockedAsyncGlob,
    glob: mockedAsyncGlob,
    sync: mockedSyncGlob,
    globSync: mockedSyncGlob,
  };
});

vi.mock("@monorepo-starter/utils", async () => {
  const utilsActual = await vi.importActual<
    typeof import("@monorepo-starter/utils")
  >(
    "@monorepo-starter/utils",
  );

  const { writeJsonFile, findPkgJson, readPkgJson } = utilsActual
    .createMemfsHandlers(vol);

  return {
    ...utilsActual,
    readPkgJson,
    writeJsonFile,
    findPkgJson,
    tryWarnChildProcess: () => {
      return true;
    },
  };
});

vi.mock("@clack/prompts", async () => {
  const clackActual = await vi.importActual<
    typeof import("@clack/prompts")
  >(
    "@clack/prompts",
  );

  return {
    ...clackActual,
    outro: () => undefined,
    intro: () => undefined,
    log: {
      ...clackActual.log,
      success: () => undefined,
      info: () => undefined,
    },
  };
});
