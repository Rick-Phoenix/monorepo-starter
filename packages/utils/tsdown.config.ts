import { defineConfig } from "tsdown";

export default defineConfig([{
  entry: "src/index.ts",
  dts: {
    sourcemap: false,
  },
  tsconfig: "tsconfig.src.json",
}]);
