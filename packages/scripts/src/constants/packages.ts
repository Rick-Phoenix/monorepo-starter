import latestVersion from "latest-version";

export type Package = {
  name: string;
  subdependencies?: Package[];
  version: string;
  isDev?: boolean;
};

const latestRange = async (pkgName: string) => {
  const version = await latestVersion(pkgName);
  if (!version.length) {
    console.warn(`⚠️ Could not get a valid version for ${pkgName}`);
  }
  return `^${version}`;
};

export const optionalPackages: Package[] = [
  {
    name: "drizzle-orm",
    version: "^0.41.0",
    subdependencies: [
      { name: "drizzle-arktype", version: "^0.1.2" },
      {
        name: "drizzle-kit",
        version: "^0.30.6",
        isDev: true,
        subdependencies: [{ name: "arktype", version: "^2.1.15" }],
      },
    ],
  },
  { name: "arktype", version: "^2.1.15" },
  { name: "dotenv", version: await latestRange("dotenv") },
  { name: "dotenv-expand", version: await latestRange("dotenv-expand") },
];
