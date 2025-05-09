import type { OptionsConfig, TypedFlatConfigItem } from "@antfu/eslint-config";
import type { FlatConfigComposer } from "eslint-flat-config-utils";

// Declare the exported function's signature
export declare function createEslintConfig(
  options?: OptionsConfig & { ignores?: string[] },
  ...overrides: TypedFlatConfigItem[]
): FlatConfigComposer;
