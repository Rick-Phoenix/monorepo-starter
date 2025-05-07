import { getLatestVersionRange } from "@monorepo-starter/utils";

type Package = {
  name: string;
  isDev?: boolean;
  catalog?: boolean;
  isWorkspace?: boolean;
  label?: string;
  preSelected?: boolean;
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
  {
    name: "lint-staged",
    isDev: true,
    catalog: true,
    preSelected: true,
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
];

type PackageJsonDependencies = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  catalogEntries: Record<string, string>;
};

export async function getPackagesWithLatestVersions(
  packages: Package[],
  options: { catalog?: boolean } = { catalog: true },
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

    if (options.catalog && pkg.catalog) {
      targetCategory[pkg.name] = "catalog:";
      output.catalogEntries[pkg.name] = version;
    } else {
      targetCategory[pkg.name] = version;
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
