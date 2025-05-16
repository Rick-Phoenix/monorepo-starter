/* eslint-disable no-console */
import { log } from "@clack/prompts";
import fg from "fast-glob";
import fs from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FsInstance } from "../fs/fs_json.js";

export function isMainModule(importMetaUrl: string) {
  if (importMetaUrl && importMetaUrl?.startsWith("file:")) {
    const modulePath = fileURLToPath(importMetaUrl);
    return process.argv[1] === modulePath;
  }
  return false;
}

export interface CreateBarrelFileOpts {
  outputFile?: string;
  srcDir?: string;
  fs?: FsInstance;
  globPatterns?: string[];
  debug?: boolean;
  silent?: boolean;
}

export async function createBarrelFile(opts?: CreateBarrelFileOpts) {
  const fsInstance = opts?.fs || fs;
  const srcDir = resolve(opts?.srcDir || "src");
  const outputFileName = opts?.outputFile || "index.ts";
  const outputFilePath = join(srcDir, outputFileName);
  const globPatterns = opts?.globPatterns || [];

  const files = await fg([...globPatterns, "**/*.ts", `!${outputFileName}`], {
    cwd: srcDir,
    onlyFiles: true,
    fs: fsInstance,
  });

  const exports = files.map((file) =>
    `export * from './${file.replace(/\.ts$/, ".js")}';`
  );

  const fileHeader =
    "// This file is auto-generated. Do not edit directly.\n\n";
  const fileContent = fileHeader + exports.join("\n") + "\n";

  if (opts?.debug) {
    console.log("--- [ BARREL DEBUG ] ---");
    console.log(
      `[ DEBUG ] Files matching the glob patterns: [${files.join(", ")}]`,
    );
  }

  fsInstance.writeFileSync(outputFilePath, fileContent);

  if (!opts?.silent) log.success(`✅ Barrel file written to ${outputFilePath}`);
}
