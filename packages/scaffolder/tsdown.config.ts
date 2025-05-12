import copy from "rollup-plugin-copy";
import { defineConfig } from "tsdown";

export default defineConfig([{
  entry: "src/bin/**/*.ts",
  outDir: "dist/bin",
  //@ts-expect-error Author has not fixed the types issue https://github.com/vladshcherbin/rollup-plugin-copy/pull/74
  plugins: [copy({
    targets: [{
      src: "templates",
      dest: "dist",
    }],
  })],
}]);
