import { getLatestVersionRange } from "@monorepo-starter/utils";

type Package = {
  name: string;
  isDev?: boolean;
  catalog?: boolean;
  isWorkspace?: boolean;
  label?: string;
  preSelected?: boolean;
  presets?: readonly string[];
};

export const optionalRootPackages: Package[] = [
  {
    name: "@infisical/cli",
    isDev: true,
    catalog: true,
  },
  {
    name: "husky",
    isDev: true,
    catalog: true,
    preSelected: true,
  },
  {
    name: "tsdown",
    isDev: true,
    catalog: true,
  },
  {
    name: "rolldown",
    isDev: true,
    catalog: true,
  },
];

const packages: Package[] = [
  { name: "dotenv", isDev: true, catalog: true },
  { name: "dotenv-expand", isDev: true, catalog: true },
  {
    name: "lint-staged",
    isDev: true,
    catalog: true,
    preSelected: true,
  },
  { name: "eslint", isDev: true, catalog: true, preSelected: true },
  {
    name: "@eslint/config-inspector",
    label: "Eslint-config-inspector",
    isDev: true,
    preSelected: true,
  },
  { name: "oxlint", isDev: true, catalog: true, preSelected: true },
  {
    name: "vitest",
    isDev: true,
    catalog: true,
  },
  {
    name: "vite",
    isDev: true,
    catalog: true,
  },
  {
    name: "drizzle-arktype",
    isDev: true,
    catalog: true,
  },
  {
    name: "drizzle-orm",
    isDev: true,
    catalog: true,
  },
  {
    name: "arktype",
    isDev: false,
    catalog: true,
  },
];

export const generalOptionalPackages = packages.concat(
  optionalRootPackages.filter((p) => p.name !== "husky"),
);

type PackageJsonDependencies = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  catalogEntries: Record<string, string>;
};

export async function getPackagesWithLatestVersions(
  packages: Package[],
  options?: { catalog?: boolean; excludeTs?: boolean },
) {
  //
  const output: PackageJsonDependencies = {
    dependencies: {},
    devDependencies: {},
    catalogEntries: {},
  };

  for (const pkg of packages) {
    const version = pkg.isWorkspace
      ? "workspace:*"
      : await getLatestVersionRange(pkg.name);

    const targetCategory = pkg.isDev
      ? output.devDependencies
      : output.dependencies;

    if (options?.catalog && pkg.catalog) {
      targetCategory[pkg.name] = "catalog:";
      output.catalogEntries[pkg.name] = version;
    } else {
      targetCategory[pkg.name] = version;
    }
  }

  if (!options?.excludeTs) {
    const typescriptVersion = await getLatestVersionRange("typescript");
    if (options?.catalog) {
      output.devDependencies.typescript = "catalog:";
      output.catalogEntries.typescript = typescriptVersion;
    } else {
      output.devDependencies.typescript = typescriptVersion;
    }
  }

  return output;
}

export async function getLintPackageDeps(
  options: { oxlint?: boolean; catalog?: boolean },
) {
  const depsList = [
    "@antfu/eslint-config",
    "@eslint/config-inspector",
    "eslint-plugin-svelte",
    "eslint-config-prettier",
    "typescript-eslint",
    "lint-staged",
    "eslint-flat-config-utils",
  ];

  const catalogDeps = [
    "eslint",
  ];

  if (options.oxlint) catalogDeps.push("eslint-plugin-oxlint", "oxlint");

  depsList.push(...catalogDeps);

  const deps: Record<string, string> = {};

  for (const dep of depsList) {
    if (options.catalog && catalogDeps.includes(dep)) deps[dep] = "catalog:";
    else deps[dep] = await getLatestVersionRange(dep);
  }

  return deps;
}

export const presetPackages = [
  { name: "@clack/prompts", catalog: true, presets: ["cli"] },
  { name: "@commander-js/extra-typings", presets: ["cli"] },
  {
    name: "fast-glob",
    presets: ["fileSystem"],
  },
  {
    name: "find-up",
    presets: ["fileSystem"],
  },
  {
    name: "fs-extra",
    presets: ["fileSystem"],
  },
  {
    name: "package-up",
    presets: ["fileSystem"],
  },
  {
    name: "path-type",
    presets: ["fileSystem"],
  },
  {
    name: "@types/node",
    presets: ["fileSystem", "cli", "templating"],
    isDev: true,
  },
  { name: "read-package-up", presets: ["templating", "fileSystem"] },
  {
    name: "read-pkg",
    presets: ["templating", "fileSystem"],
  },
  {
    name: "write-json-file",
    presets: ["templating", "filesystem"],
  },
  {
    name: "yaml",
    presets: ["templating"],
  },
  {
    name: "dedent",
    presets: ["templating"],
  },
  {
    name: "nunjucks",
    presets: ["templating"],
  },
  { name: "@types/nunjucks", presets: ["templating"], isDev: true },
] as const;

export type PackagePreset = typeof presetPackages[number]["presets"][number];
export const packagesPresetChoices = Array.from(
  new Set(presetPackages.flatMap((pkg) => pkg.presets)),
);
