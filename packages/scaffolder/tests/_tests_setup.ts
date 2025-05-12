import { vol } from "memfs";
import { join } from "node:path";
import { beforeEach } from "vitest";
import "./_mocks/fs.js";
import { copyDirectoryToMemfs } from "./lib/memfs.js";

// vi.mock("fast-glob", async () => {
//   const actualFastGlob = await vi.importActual<typeof import("fast-glob")>(
//     "fast-glob",
//   );
//   const mockedGlobFn = async (
//     pattern: string | string[],
//     options: FastGlob.Options = {},
//   ) => {
//     const optionsWithAdapter: FastGlob.Options = {
//       ...options,
//       fs,
//     };
//     return actualFastGlob.default(pattern, optionsWithAdapter);
//   };
//
//   return {
//     ...actualFastGlob,
//     default: mockedGlobFn,
//   };
// });

beforeEach(() => {
  const templatesDir = join(import.meta.dirname, "../templates");
  const srcTemplatesDir = join(
    import.meta.dirname,
    "../src/templates",
  );

  vol.reset();
  copyDirectoryToMemfs(
    templatesDir,
    srcTemplatesDir,
  );
});
