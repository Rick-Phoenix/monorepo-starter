import antfu from "@antfu/eslint-config";
import eslintConfigPrettier from "eslint-config-prettier";
import prettierConfig from "./prettier.config.js";

function createEslintConfig(options, ...overrides) {
  return antfu(
    {
      typescript: {
        tsconfigPath: "tsconfig.json",
        overrides: {
          "@typescript-eslint/no-unused-vars": [
            "warn",
            {
              args: "all",
              argsIgnorePattern: "^[_ce(evt)f(ws)]",
              caughtErrors: "all",
              caughtErrorsIgnorePattern: "^_",
              destructuredArrayIgnorePattern: "^_",
              varsIgnorePattern: "^[_k(key)]",
              ignoreRestSiblings: true,
            },
          ],
        },
        overridesTypeAware: {
          "ts/prefer-nullish-coalescing": [
            "warn",
            {
              ignorePrimitives: {
                string: true,
                boolean: true,
              },
            },
          ],
          "ts/consistent-type-definitions": "off",
        },
      },
      javascript: true,
      imports: true,
      disables: true,
      regexp: true,
      test: true,
      jsx: options?.jsx || options?.react || false,
      perfectionist: false,
      stylistic: false,
      jsonc: false,
      yaml: false,
      markdown: false,
      toml: false,
      ...options,
    },
    {
      rules: {
        "no-console": "warn",
        "node/no-process-env": "error",
        "antfu/no-top-level-await": "off",
        "unicorn/filename-case": ["error", { case: "kebabCase" }],
        "unicorn/prefer-json-parse-buffer": "error",
        "unicorn/prefer-negative-index": "warn",
        "unicorn/better-regex": "warn",
        "import/no-mutable-exports": "warn",
      },
    },
    ...overrides,
    eslintConfigPrettier
  );
}

//const eslintConfigReact = createEslintConfig(
//  { react: true },
//  {
//    rules: {
//      "react/no-children-prop": "off",
//      "react/prop-types": "off",
//      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
//      "@typescript-eslint/only-throw-error": "off",
//    },
//  }
//);

export { createEslintConfig, prettierConfig };
