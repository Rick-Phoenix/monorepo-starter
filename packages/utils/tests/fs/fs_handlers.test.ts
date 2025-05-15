import { vol } from "memfs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemfsHandlers } from "../../src/index.js";

const { findUp, findPkgJson, readPkgJson, writeJsonFile } = createMemfsHandlers(
  vol,
);

const r = resolve;

const packageJson = r("package.json");
const nestedPath = r("somedir/anotherdir/");
const deeplyNestedPath = r(
  "somedir/anotherdir/yetanotherdir/",
);

beforeEach(() => {
  vol.fromJSON({
    [packageJson]: '{"name":"test", "scripts":{"test":"vitest run"}}',
    [nestedPath]: null,
    [deeplyNestedPath]: null,
    [r("/testpath/package.json")]: '{"name":"testpath"}',
    [r("/testpath/nest1/nest2")]: null,
  });
});

describe("testing the fs handlers", async () => {
  describe("json handlers", async () => {
    it("reads a package.json file", async () => {
      const pJson = await readPkgJson();

      expect(typeof pJson).toBe("object");
      expect(typeof pJson.name).toBe("string");
      expect(pJson?.scripts?.test).toBe("vitest run");
    });

    it("writes a package.json file", async () => {
      await writeJsonFile(r("test/package.json"), {
        name: "writtenPkgJson",
        scripts: { test: "test2" },
      });

      const result = await readPkgJson({ cwd: r("test") });

      expect(result.name).toBe("writtenPkgJson");
      expect(result.scripts?.test).toBe("test2");
    });

    it("finds a package.json file in the parent directories", async () => {
      const [pJson] = await findPkgJson({ startDir: nestedPath });

      expect(pJson.name).toBe("test");
    });

    it("stops at the default limit", async () => {
      await expect(findPkgJson({ startDir: deeplyNestedPath })).rejects
        .toThrow("Could not find 'package.json'");
    });

    it("respects the defined limit", async () => {
      const [pJson] = await findPkgJson({
        startDir: deeplyNestedPath,
        limit: 4,
      });

      expect(pJson.name).toBe("test");
    });

    it("ignores excluded directories", async () => {
      await expect(
        findPkgJson({
          startDir: r("/testpath/nest1/nest2"),
          excludeDirs: ["testpath"],
          limit: 4,
        }),
      ).rejects.toThrowError("Could not find");
    });
  });

  describe("findUp", async () => {
    it("finds a directory with a file marker", async () => {
      const dir = await findUp({
        fileMarker: "package.json",
        type: "directory",
        startDir: nestedPath,
      });

      expect(dir).toBe(process.cwd());
    });

    it("finds a named directory", async () => {
      const dir = await findUp({
        name: process.cwd(),
        type: "directory",
        startDir: nestedPath,
      });

      expect(dir).toBe(process.cwd());
    });

    it("finds a named file", async () => {
      const file = await findUp({
        name: "package.json",
        type: "file",
        startDir: nestedPath,
      });

      expect(file).toBe(r("package.json"));
    });

    it("respects the limit", async () => {
      const dir = findUp({
        fileMarker: "package.json",
        type: "directory",
        startDir: nestedPath,
        limit: 1,
      });

      await expect(dir).rejects.toThrowError("Could not find");
    });

    it("throws if neither a name or a fileMarker are given for a dir", async () => {
      await expect(findUp({ type: "directory" })).rejects.toThrowError(
        "No name or file marker",
      );
    });

    it("throws if a name is not given for a file", async () => {
      await expect(findUp({ type: "file" })).rejects.toThrowError(
        "No name was given",
      );
    });

    it("skips excluded directories", async () => {
      await expect(
        findUp({
          type: "file",
          name: "package.json",
          excludeDirs: ["testpath"],
          startDir: r("/testpath/nest1/nest2"),
        }),
      ).rejects.toThrowError("Could not find");
    });
  });
});
