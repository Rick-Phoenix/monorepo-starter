// @ts-check

import { createEslintConfig } from "@monorepo-starter/linting-config";

export default createEslintConfig({
  typescript: {
    parserOptions: {
      project: ["./tsconfig.json", "./tsconfig.spec.json"],
    },
  },
});
