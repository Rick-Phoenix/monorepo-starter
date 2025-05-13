// @ts-check

import { createEslintConfig } from "@monorepo-starter/linting-config";

export default createEslintConfig({}, {
  rules: {
    "node/no-process-env": "off",
  },
});
