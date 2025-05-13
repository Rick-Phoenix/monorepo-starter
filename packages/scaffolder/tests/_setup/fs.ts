import type FastGlob from "fast-glob";
import { fs as memFs } from "memfs";
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
