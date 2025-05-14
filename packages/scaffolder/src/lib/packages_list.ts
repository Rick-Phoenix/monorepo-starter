import { getLatestVersionRange } from "@monorepo-starter/utils";

interface Package {
  name: string;
  isDev?: boolean;
  catalog?: boolean;
  isWorkspace?: boolean;
  label?: string;
  preSelected?: boolean;
  presets?: readonly string[];
}

const packages: Package[] = [
  { name: "dotenv", isDev: true, catalog: true },
  { name: "dotenv-expand", isDev: true, catalog: true },
  {
    name: "lint-staged",
    isDev: true,
    catalog: true,
    preSelected: true,
    presets: ["base"],
  },
  {
    name: "eslint",
    isDev: true,
    catalog: true,
    preSelected: true,
    presets: ["base"],
  },
  {
    name: "@eslint/config-inspector",
    label: "Eslint-config-inspector",
    isDev: true,
    preSelected: true,
    presets: ["base"],
  },
  {
    name: "oxlint",
    isDev: true,
    catalog: true,
    preSelected: true,
    presets: ["base"],
  },
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
  {
    name: "@infisical/cli",
    isDev: true,
    catalog: true,
    presets: ["root"],
  },
  {
    name: "husky",
    isDev: true,
    catalog: true,
    preSelected: true,
    presets: ["root"],
  },
];

export const packagesMap = new Map<string, Package>();

packages.forEach((p) => {
  packagesMap.set(p.name, p);
});

export const optionalRootPackages: Package[] = packages.filter((p) =>
  p.presets?.includes("root")
);

export const generalOptionalPackages = packages.filter((p) =>
  p.name !== "husky"
);

interface PackageJsonDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  catalogEntries: Record<string, string>;
}

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
    "@eslint/config-inspector",
    "eslint-plugin-svelte",
    "eslint-config-prettier",
    "eslint-flat-config-utils",
  ];

  const catalogDeps = [
    "eslint",
    "@antfu/eslint-config",
    "typescript-eslint",
    "lint-staged",
  ];

  if (options.oxlint) catalogDeps.push("eslint-plugin-oxlint", "oxlint");

  depsList.push(...catalogDeps);

  const lintConfigDeps: Record<string, string> = {};
  const lintCatalogEntries: Record<string, string> = {};

  for (const dep of depsList) {
    if (options.catalog && catalogDeps.includes(dep)) {
      lintConfigDeps[dep] = "catalog:";
      lintCatalogEntries[dep] = await getLatestVersionRange(dep);
    } else lintConfigDeps[dep] = await getLatestVersionRange(dep);
  }

  return { lintConfigDeps, lintCatalogEntries };
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
    name: "@types/node",
    presets: ["fileSystem", "cli", "templating"],
    isDev: true,
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
