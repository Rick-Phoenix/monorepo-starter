import { createFsFromVolume, vol } from "memfs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createMemfsHandlers,
  findPnpmWorkspace as findPnpmWorkspaceOriginal,
  type FindPnpmWorkspaceOpts,
  type FsPromisesInstance,
  readPnpmWorkspace as readPnpmWorkspaceOriginal,
  type ReadPnpmWorkspaceOpts,
  updatePnpmCatalog as updatePnpmCatalogOriginal,
  type UpdatePnpmCatalogOpts,
} from "../../src/index.js";

const r = resolve;
const pnpmWorkspaceContent = `
packages:
  - apps/*
  - packages/*

catalog:
  vitest: ^1.0.0
  typescript: ^1.0.0

catalogs:
  first:
    vitest: ^1.0.0
    typescript: ^1.0.0
  second:
    vitest: ^1.0.0
    typescript: ^1.0.0
`;

const pnpmWorkSpacePath = r("pnpm-workspace.yaml");
const nestedPath = r("p1/p2/p3/p4");

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    [pnpmWorkSpacePath]: pnpmWorkspaceContent,
    [nestedPath]: null,
  });
});

const { writeYamlFile, readYamlFile } = createMemfsHandlers(vol);

const fs = createFsFromVolume(vol).promises as unknown as FsPromisesInstance;

const updatePnpmCatalog = async (opts: UpdatePnpmCatalogOpts) => {
  return updatePnpmCatalogOriginal({
    ...opts,
    fs,
  });
};

const findPnpmWorkspace = async (opts: FindPnpmWorkspaceOpts) => {
  return findPnpmWorkspaceOriginal({
    ...opts,
    fs,
  });
};

const readPnpmWorkspace = async (opts?: ReadPnpmWorkspaceOpts) => {
  return readPnpmWorkspaceOriginal({
    ...opts,
    fs,
  });
};

const semVerRegexp = /^\^([2-9]|\d{2,3})(\.\d{1,3}){2}/;

describe("testing the yaml methods", async () => {
  it("reads a yaml file", async () => {
    const file = await readYamlFile({ filePath: pnpmWorkSpacePath });

    expect(typeof file.catalog).toBe("object");
  });

  it("writes a yaml file", async () => {
    await writeYamlFile("/out/test.yaml", { catalog: { test: "test" } });

    const content = await readYamlFile({ filePath: "/out/test.yaml" });

    expect(typeof content.catalog).toBe("object");
  });

  it("reads a pnpm-workspace file", async () => {
    const pnpmWorkspace = await readPnpmWorkspace();

    expect(typeof pnpmWorkspace.catalog).toBe("object");
  });

  it("finds a pnpm-workspace file", async () => {
    const [pnpmWorkspace] = await findPnpmWorkspace({
      startDir: nestedPath,
      limit: 10,
    });

    expect(typeof pnpmWorkspace.catalog).toBe("object");
  });

  it("respects the limit", async () => {
    await expect(findPnpmWorkspace({
      startDir: nestedPath,
      limit: 1,
    })).rejects.toThrowError("Could not find");
  });

  it("updates the catalog", async () => {
    await updatePnpmCatalog({ filePath: pnpmWorkSpacePath });

    const updated = await readPnpmWorkspace();

    expect(updated.catalog.vitest).toMatch(semVerRegexp);
    expect(updated.catalog.typescript).toMatch(semVerRegexp);
  });

  it("respects the exclude field", async () => {
    await updatePnpmCatalog({
      filePath: pnpmWorkSpacePath,
      exclude: ["typescript"],
    });

    const updated = await readPnpmWorkspace();

    expect(updated.catalog.vitest).toMatch(semVerRegexp);
    expect(updated.catalog.typescript).toBe("^1.0.0");
  });

  it("respects the include field", async () => {
    await updatePnpmCatalog({
      filePath: pnpmWorkSpacePath,
      include: ["vitest"],
    });

    const updated = await readPnpmWorkspace();

    expect(updated.catalog.vitest).toMatch(semVerRegexp);
    expect(updated.catalog.typescript).toBe("^1.0.0");
  });

  it("adds extra entries to the list", async () => {
    await updatePnpmCatalog({
      filePath: pnpmWorkSpacePath,
      add: ["pnpm"],
    });

    const updated = await readPnpmWorkspace();

    expect(updated.catalog.pnpm).toMatch(semVerRegexp);
  });

  it("updates the main catalog and the named catalogs", async () => {
    await updatePnpmCatalog({
      filePath: pnpmWorkSpacePath,
      catalogs: "all",
    });

    const updated = await readPnpmWorkspace();

    expect(updated.catalog.vitest).toMatch(semVerRegexp);
    expect(updated.catalog.typescript).toMatch(semVerRegexp);

    expect(updated.catalogs?.first?.vitest).toMatch(semVerRegexp);
    expect(updated.catalogs?.first?.typescript).toMatch(semVerRegexp);

    expect(updated.catalogs?.second?.vitest).toMatch(semVerRegexp);
    expect(updated.catalogs?.second?.typescript).toMatch(semVerRegexp);
  });

  it("updates the main catalog and the selected catalogs", async () => {
    await updatePnpmCatalog({
      filePath: pnpmWorkSpacePath,
      catalogs: ["first"],
    });

    const updated = await readPnpmWorkspace();

    expect(updated.catalog.vitest).toMatch(semVerRegexp);
    expect(updated.catalog.typescript).toMatch(semVerRegexp);

    expect(updated.catalogs?.first?.vitest).toMatch(semVerRegexp);
    expect(updated.catalogs?.first?.typescript).toMatch(semVerRegexp);

    expect(updated.catalogs?.second?.vitest).toBe("^1.0.0");
    expect(updated.catalogs?.second?.typescript).toBe("^1.0.0");
  });

  it("updates only the selected catalogs", async () => {
    await updatePnpmCatalog({
      filePath: pnpmWorkSpacePath,
      catalogs: ["first"],
      noMainCatalog: true,
    });

    const updated = await readPnpmWorkspace();

    expect(updated.catalog.vitest).toBe("^1.0.0");
    expect(updated.catalog.typescript).toBe("^1.0.0");

    expect(updated.catalogs?.first?.vitest).toMatch(semVerRegexp);
    expect(updated.catalogs?.first?.typescript).toMatch(semVerRegexp);

    expect(updated.catalogs?.second?.vitest).toBe("^1.0.0");
    expect(updated.catalogs?.second?.typescript).toBe("^1.0.0");
  });
});
