import { getLatestVersionRange } from "@monorepo-starter/utils";

export type OptionalPackage = typeof optionalPackages[number] | string;

type DevDependencyPackage = typeof devDependencyPackages[number] | string;

export const devDependencyPackages = [
  "@infisical/cli",
  "lint-staged",
  "tsdown",
  "rolldown",
  "vitest",
  "vite",
];

export const optionalPackages = [
  ...devDependencyPackages,
  "drizzle-arktype",
  "drizzle-orm",
  "arktype",
] as const;

export const subDependencies: {
  [K in OptionalPackage]?: (OptionalPackage)[];
} = {
  "drizzle-orm": ["drizzle-kit"],
  "drizzle-arktype": ["arktype", "drizzle-orm"],
};

type PackagesWithVersion = { [key: string]: string };

type Packages = {
  dependencies: PackagesWithVersion;
  devDependencies: PackagesWithVersion;
};

export async function getPackagesWithLatestVersions(
  packages: OptionalPackage[],
): Promise<Packages> {
  //
  const output: Packages = { dependencies: {}, devDependencies: {} };

  async function assignVersion(pkg: OptionalPackage) {
    //
    const pkgSubDependencies: OptionalPackage[] | undefined =
      subDependencies[pkg];

    if (pkgSubDependencies) {
      for (const subDep of pkgSubDependencies) {
        await assignVersion(subDep);
      }
    }

    if (
      output.dependencies[pkg] || output.devDependencies[pkg]
    ) {
      return;
    }

    const versionRange = await getLatestVersionRange(pkg);
    const isDevDependency = devDependencyPackages.includes(
      pkg,
    );

    if (isDevDependency) {
      output.devDependencies[pkg] = versionRange;
    } else {
      output.dependencies[pkg] = versionRange;
    }
  }

  for (const pkg of packages) {
    await assignVersion(pkg);
  }

  return output;
}
