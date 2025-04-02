const config = {
  trailingComma: "es5",
  tabWidth: 2,
  semi: true,
  singleQuote: false,
  printWidth: 100,
  overrides: [
    {
      files: ["*.jsonc", ".eslintrc", "tsconfig*.json", "*.code-workspace"],
      options: {
        trailingComma: "none",
      },
    },
  ],
};

export default config;
