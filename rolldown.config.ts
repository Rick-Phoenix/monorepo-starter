import { cancel, multiselect } from "@clack/prompts";
import { assertDirExists, assertFileExists } from "@monorepo-starter/utils";
import { join } from "node:path";
import { build, RolldownOptions } from "rolldown";

const monorepoRoot = import.meta.dirname;

const packagesDir = join(monorepoRoot, "packages");

const packagesList: PackageOptions[] = [
  {
    name: "utils",
    rollDownOpts: {
      external: ["fast-glob"],
    },
  },
  {
    name: "scripts",
    entrypoint: "src/init_repo.ts",
    rollDownOpts: {
      external: ["unicorn-magic"],
    },
  },
];

type PackageOptions = string | PackageData;

type PackageData = {
  name: string;
  label?: string;
  entrypoint?: string;
  rollDownOpts: RolldownOptions;
  noMergeDefaults?: boolean;
  noSingleFile?: boolean;
};

async function buildWithRolldown() {
  const buildTargets = await multiselect({
    message: "Choose the packages to build:",
    options: await genMultiRolldownOptions(packagesList),
    required: false,
  });

  if (!Array.isArray(buildTargets) || !buildTargets.length) {
    cancel("Operation canceled.");
    process.exit(1);
  }

  await build([...buildTargets]);
}

async function genRolldownOptions(packageOptions: PackageOptions) {
  const isString = typeof packageOptions === "string";
  const packageName = isString ? packageOptions : packageOptions.name;
  const packagePath = await assertDirExists(join(packagesDir, packageName));
  const entrypoint = (!isString && packageOptions.entrypoint)
    ? packageOptions.entrypoint
    : "src/index.ts";
  const input = await assertFileExists(join(packagePath, entrypoint));
  const outputAsDir = !isString && packageOptions.noSingleFile;
  const buildOutput = outputAsDir
    ? { dir: join(packagePath, "dist") }
    : { file: join(packagePath, "dist/index.js") };

  const defaults = isString || !packageOptions?.noMergeDefaults
    ? {
      input,
      output: buildOutput,
    }
    : {};

  const rollDownOpts = isString ? {} : packageOptions.rollDownOpts;

  return {
    label: isString
      ? packageOptions
      : packageOptions?.label ?? packageOptions.name,
    value: {
      ...defaults,
      ...rollDownOpts,
    },
  };
}

async function genMultiRolldownOptions(packages: PackageOptions[]) {
  const output: { label: string; value: object }[] = [];
  for (const pac of packages) {
    const packageOpt = await genRolldownOptions(pac);
    output.push(packageOpt);
  }
  return output;
}

await buildWithRolldown();
