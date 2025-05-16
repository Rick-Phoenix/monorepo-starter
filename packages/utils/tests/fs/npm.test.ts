import { createFsFromVolume, vol } from "memfs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createMemfsHandlers,
  type FsPromisesInstance,
  installCatalogPackages as installCatalogPackagesOriginal,
  type InstallCatalogPackagesOpts,
  semVerRegexp,
} from "../../src/index.js";

const fs = createFsFromVolume(vol).promises as unknown as FsPromisesInstance;

const r = resolve;
const pnpmWorkspaceContent = `
packages:
  - apps/*
  - packages/*

catalog:

`;

const pnpmWorkspacePath = r("pnpm-workspace.yaml");
const packageJson = r("p1/p2/p3/package.json");

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    [pnpmWorkspacePath]: pnpmWorkspaceContent,
    [packageJson]: '{"name":"test"}',
  });
});

const installCatalogPackages = async (opts: InstallCatalogPackagesOpts) => {
  return installCatalogPackagesOriginal({ ...opts, fs });
};

const { readPnpmWorkspace, readPkgJson } = createMemfsHandlers(vol);

describe("testing installCatalogPackages", async () => {
  it("updates the catalog and package.json and respects the dev flag", async () => {
    await installCatalogPackages({
      pnpmWorkspacePath,
      packageJson,
      packages: ["vitest", "typescript"],
      dev: true,
    });

    const pnpmResult = await readPnpmWorkspace();
    const pkgJsonResult = await readPkgJson({ filePath: packageJson });

    expect(pkgJsonResult.devDependencies?.typescript).toBe("catalog:");
    expect(pkgJsonResult.devDependencies?.vitest).toBe("catalog:");

    expect(pkgJsonResult.dependencies?.typescript).toBe(undefined);
    expect(pkgJsonResult.dependencies?.vitest).toBe(undefined);

    expect(pnpmResult.catalog?.typescript).toMatch(semVerRegexp);
    expect(pnpmResult.catalog?.vitest).toMatch(semVerRegexp);
  });
});
