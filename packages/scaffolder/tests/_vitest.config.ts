import { join, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const j = join;
const r = resolve;

const dir = import.meta.dirname;
const setupDir = r(dir, "./_setup");

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "@": r(dir, "../src"),
    },
  },

  test: {
    setupFiles: [j(setupDir, "mocks.ts"), j(dir, "_tests_setup.ts")],
    globals: true,
    environment: "node",
    silent: "passed-only",
    sequence: {
      setupFiles: "list",
    },
  },
});
