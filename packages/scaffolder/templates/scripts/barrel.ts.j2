import fg from "fast-glob";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const srcDir = resolve(import.meta.dirname, "../src");

const files = await fg(["**/*.ts", "!index.ts"], {
  cwd: srcDir,
  onlyFiles: true,
});

const exports = files.map((file) =>
  `export * from './${file.replace(/\.ts$/, ".js")}';`
);

const fileHeader = "// This file is auto-generated. Do not edit directly.\n\n";
const fileContent = fileHeader + exports.join("\n") + "\n";

await writeFile(join(srcDir, "index.ts"), fileContent);
