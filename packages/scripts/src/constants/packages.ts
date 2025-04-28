export type Package = {
  name: string;
  subdependencies?: Package[];
  version: string;
  isDev?: boolean;
};

// Section - Packages with pinned version
export const pinnedVerPackages = {
  eslint: "^9.23.0",
  typescript: "^5.8.2",
  oxlint: "^0.16.3",
};

// Section - Optional packages list
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
  {
    name: "hono",
    version: "^4.7.5",
    subdependencies: [
      {
        name: "@hono/arktype-validator",
        version: "^2.0.0",
      },
      { name: "arktype", version: "^2.1.15" },
    ],
  },
];
