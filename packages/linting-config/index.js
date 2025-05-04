import { antfu } from "@antfu/eslint-config";
import eslintConfigPrettier from "eslint-config-prettier";
import oxlint from "eslint-plugin-oxlint";

function createEslintConfig(options, ...overrides) {
  return antfu(
    {
      ignores: [
        "**/dist/**",
        "**/node_modules/**",
        "**/.moon/**",
        "**/.cache/**",
      ],
      typescript: {
        tsconfigPath: "tsconfig.json",
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
      imports: true,
      disables: true,
      regexp: true,
      test: true,
      jsx: options?.jsx || options?.react || false,
      stylistic: false,
      jsonc: false,
      yaml: false,
      markdown: false,
      toml: false,
      svelte: options?.svelte || false,
      ...options,
    },
    {
      rules: {
        "no-unused-vars": "off",
        "node/no-process-env": "error",
        "node/prefer-promises/fs": "error",
        "node/prefer-global/process": "off",
        "antfu/no-top-level-await": "off",
        "unicorn/prefer-json-parse-buffer": "error",
        "unicorn/better-regex": "warn",
        "perfectionist/sort-named-exports": "off",
        "perfectionist/sort-named-imports": "off",
        "perfectionist/sort-exports": "off",
        "perfectionist/sort-imports": "off",
        "unused-imports/no-unused-vars": "off",
        "import/consistent-type-specifier-style": "off",
        "ts/strict-boolean-expressions": "off",
        "ts/unbound-method": "off",
      },
    },
    ...overrides,
    eslintConfigPrettier,
    ...oxlint.configs["flat/recommended"],
    ...oxlint.buildFromOxlintConfigFile("../../.oxlintrc.json"),
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

export { createEslintConfig };
