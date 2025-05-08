// @ts-check

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import copy from "rollup-plugin-copy";
import { defineConfig } from "tsdown";

const binModules = await readdir("./src/bin");

const binFiles = binModules.map((mod) => join("./src/bin", mod));

/** @type {import('tsdown').UserConfig} */
export default defineConfig([{
  entry: binFiles,
  outDir: "dist/bin",
  plugins: [copy({
    targets: [{
      src: "src/templates",
      dest: "dist",
    }],
  })],
}]);
