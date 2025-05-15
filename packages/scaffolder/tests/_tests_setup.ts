import { beforeEach, vi } from "vitest";
import { resetVol } from "./lib/memfs.js";

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
