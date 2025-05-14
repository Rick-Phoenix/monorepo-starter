import { vol } from "memfs";
import { join } from "node:path";
import { beforeEach, vi } from "vitest";
import "./_setup/fs.js";
import { copyDirectoryToMemfs } from "./lib/memfs.js";

export function resetVol() {
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
}

beforeEach(resetVol);

vi.mock("../src/lib/install_package.js", async () => {
  const installPackageModule = await vi.importActual<
    typeof import("../src/lib/install_package.js")
  >("../src/lib/install_package.js");
  return {
    ...installPackageModule,
    installPackages: vi.fn((packages: string | string[]) => {
      return packages;
    }),
  };
});
