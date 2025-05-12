import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "../src"),
    },
  },

  test: {
    setupFiles: [resolve(import.meta.dirname, "_tests_setup.ts")],
    globals: true,
    environment: "node",
  },
});
