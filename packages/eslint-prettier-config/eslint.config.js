import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

// @ts-check
/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  { ignores: ["dist/"] },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.es2020 },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  eslintConfigPrettier
);
