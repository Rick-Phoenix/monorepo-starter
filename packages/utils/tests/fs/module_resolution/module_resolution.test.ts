import { createFsFromVolume, vol } from "memfs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createBarrelFile as createBarrelFileOriginal,
  type CreateBarrelFileOpts,
  type FsInstance,
} from "../../../src/index.js";

const fs = createFsFromVolume(vol) as unknown as FsInstance;

const r = resolve;

const nestedPath = "p1/p2/p3/file.ts";
const nestedPath2 = "p1/p2/file2.ts";

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    [r("src", nestedPath)]: "",
    [r("src", nestedPath2)]: "",
    [r("src2", nestedPath)]: "",
    [r("src2", nestedPath2)]: "",
  });
});

const createBarrelFile = async (opts?: CreateBarrelFileOpts) => {
  return createBarrelFileOriginal({ ...opts, fs });
};

describe("createBarrelFile", async () => {
  it("creates the barrel file", async () => {
    await createBarrelFile();

    const result = fs.readFileSync(r("src/index.ts"), "utf8");
    expect(result).toMatch(
      `export * from './${nestedPath.replace(/\.ts$/, ".js")}'`,
    );
    expect(result).toMatch(
      `export * from './${nestedPath2.replace(/\.ts$/, ".js")}'`,
    );
  });

  it("handles glob duplicates gracefully", async () => {
    await createBarrelFile({ globPatterns: ["**/*.ts", "!index.ts"] });

    const result = fs.readFileSync(r("src/index.ts"), "utf8");
    expect(result).toMatch(
      `export * from './${nestedPath.replace(/\.ts$/, ".js")}'`,
    );
    expect(result).toMatch(
      `export * from './${nestedPath2.replace(/\.ts$/, ".js")}'`,
    );
  });

  it("follows a non-default path for the output file", async () => {
    await createBarrelFile({ outputFile: "nonIndex.ts" });

    const result = fs.readFileSync(r("src/nonIndex.ts"), "utf8");
    expect(result).toMatch(
      `export * from './${nestedPath.replace(/\.ts$/, ".js")}'`,
    );
    expect(result).toMatch(
      `export * from './${nestedPath2.replace(/\.ts$/, ".js")}'`,
    );
  });

  it("follows a different src directory", async () => {
    await createBarrelFile({ srcDir: "src2" });

    const result = fs.readFileSync(r("src2/index.ts"), "utf8");
    expect(result).toMatch(
      `export * from './${nestedPath.replace(/\.ts$/, ".js")}'`,
    );
    expect(result).toMatch(
      `export * from './${nestedPath2.replace(/\.ts$/, ".js")}'`,
    );
  });

  it("follows glob patterns for files", async () => {
    await createBarrelFile({ globPatterns: ["!**/file2.ts"] });

    const result = fs.readFileSync(r("src/index.ts"), "utf8");
    expect(result).toMatch(
      `export * from './${nestedPath.replace(/\.ts$/, ".js")}'`,
    );
    expect(result).not.toMatch(
      `export * from './${nestedPath2.replace(/\.ts$/, ".js")}'`,
    );
  });

  it("follows glob patterns for directories", async () => {
    await createBarrelFile({ globPatterns: ["!**/p3/*.ts"] });

    const result = fs.readFileSync(r("src/index.ts"), "utf8");
    expect(result).not.toMatch(
      `export * from './${nestedPath.replace(/\.ts$/, ".js")}'`,
    );
    expect(result).toMatch(
      `export * from './${nestedPath2.replace(/\.ts$/, ".js")}'`,
    );
  });
});
