import { cancel, multiselect } from "@clack/prompts";
import { assertPath } from "@monorepo-starter/utils";
import { join } from "node:path";
import { defineConfig, RolldownOptions } from "rolldown";

const monorepoRoot = import.meta.dirname;

const packagesDir = join(monorepoRoot, "packages");

const packagesList: PackageOptions[] = [
  "utils",
  {
    name: "scripts",
    entrypoint: "src/init_repo.ts",
    rollDownOpts: {
      external: ["unicorn-magic"],
    },
  },
];

const buildTargets = await multiselect({
  message: "Choose the packages to build:",
  options: await genRolldownOptions(packagesList),
  required: false,
});

if (!Array.isArray(buildTargets) || !buildTargets.length) {
  cancel("Operation canceled.");
  process.exit(1);
}

export default defineConfig([...buildTargets]);

type PackageOptions = string | PackageData;

type PackageData = {
  name: string;
  label?: string;
  entrypoint?: string;
  rollDownOpts: RolldownOptions;
  noMergeDefaults?: boolean;
};

async function genRolldownOptions(packages: PackageOptions[]) {
  const output: { label: string; value: object }[] = [];
  for (const pac of packages) {
    const isString = typeof pac === "string";
    const packageName = isString ? pac : pac.name;
    const packagePath = await assertPath(join(packagesDir, packageName));
    const entrypoint = (!isString && pac.entrypoint)
      ? pac.entrypoint
      : "src/index.ts";
    const input = await assertPath(join(packagePath, entrypoint));

    const defaults = isString || !pac?.noMergeDefaults
      ? {
        input,
        output: {
          file: join(packagePath, "dist/index.js"),
        },
      }
      : {};

    const rollDownOpts = isString ? {} : pac.rollDownOpts;

    output.push({
      label: isString ? pac : pac?.label ?? pac.name,
      value: { ...defaults, ...rollDownOpts },
    });
  }

  return output;
}
