// @ts-check

import copy from "rollup-plugin-copy";
import { defineConfig } from "tsdown";

/** @type {import('tsdown').UserConfig} */
export default defineConfig({
  entry: ["./src/init_repo.ts", "./src/create_package.ts"],
  dts: true,
  plugins: [copy({
    targets: [{
      src: "src/templates",
      dest: "dist",
    }],
  })],
});
