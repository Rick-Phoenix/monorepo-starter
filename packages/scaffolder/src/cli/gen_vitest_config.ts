import { log } from "@clack/prompts";
import { Command, Option } from "@commander-js/extra-typings";
import {
  confirm,
  findPkgJson,
  showWarning,
  tryAction,
  tryCatch,
  writeJsonFile,
  writeRender,
} from "@monorepo-starter/utils";
import download from "download";
import { mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { installPackages, packageManagers } from "../lib/install_package.js";

const pluginPresets = [
  { name: "", packageName: "" },
];

const setupPresets = ["env", "fs", "fast-glob", "clack"];

export async function genVitestConfig(injectedArgs?: string[]) {
  const program = new Command()
    .option(
      "-d, --dir <dir>",
      "The directory to use for the config file",
      ".",
    )
    .option("-i, --install", "Install vitest and the selected plugins")
    .option("-s, --script", "Add vitest as the test script in package.json")
    .addOption(
      new Option(
        "-m, --package-manager <package_manager>",
        "The package manager to install tsdown with",
      ).choices(packageManagers).default("pnpm").implies({ install: true }),
    )
    .option(
      "--tests-dir <path>",
      "Create a directory for tests at the specified path",
      "tests",
    )
    .option(
      "--setup-file <path>",
      "The path to the setup file (relative to testsDir)",
      "_setup/_tests_setup.ts",
    )
    .addOption(new Option("--preset <preset...>").choices(setupPresets))
    .addOption(new Option("-p, --plugin <plugin...>"))
    .addOption(
      new Option("-u, --url <url>", "The url for the config file to download")
        .implies({
          kind: "from-url",
        }),
    )
    .showHelpAfterError();

  const isRunningAsCli = !injectedArgs;
  const fatal = process.env.NODE_ENV === "test" || isRunningAsCli;

  if (!isRunningAsCli) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const args = program.opts();

  const outputDir = resolve(args.dir);
  const outputFile = join(outputDir, "vitest.config.ts");
  const srcRelPath = relative(outputDir, "src");
  const setupFilePath = resolve(args.testsDir, args.setupFile);
  const setupFileRelPath = relative(outputDir, setupFilePath);
  const setupDir = dirname(setupFilePath);

  let isOk: boolean | undefined;

  const plugins = args.plugin
    ? args.plugin.map((plugin) => {
      for (const preset of pluginPresets) {
        if (plugin === preset.name) {
          return { name: plugin, packageName: preset.packageName };
        } else if (plugin === preset.packageName) {
          return { name: preset.name, packageName: plugin };
        }
      }

      return { name: plugin, packageName: plugin };
    })
    : [];

  const packageNames = plugins.map((p) => p.packageName);

  if (args.install) {
    isOk = installPackages(
      ["vitest", ...packageNames],
      args.packageManager,
      true,
    );

    if (!isOk) process.exit(1);
  }

  isOk = await tryAction(
    mkdir(args.testsDir, { recursive: true }),
    "creating the tests directory",
    { fatal },
  );

  isOk = await tryAction(
    writeRender({
      outputPath: setupFilePath,
      templateFile: resolve(
        import.meta.dirname,
        "../templates/tests/tests.setup.ts.j2",
      ),
    }),
    "writing the tests setup file",
    { fatal },
  );

  let action: Promise<unknown>;

  if (args.url) {
    action = download(args.url, outputDir, {
      filename: "vitest.config.ts",
    });
  } else {
    const templateFile = resolve(
      import.meta.dirname,
      "../templates/configs/vitest.config.ts.j2",
    );

    const presets = args.preset || [];
    const presetsRelPaths = [];

    for (const preset of presets) {
      const presetRelPath = relative(outputDir, join(setupDir, `${preset}.ts`));
      presetsRelPaths.push(presetRelPath);
      const templateFile = resolve(
        import.meta.dirname,
        `../templates/tests/presets/${preset}.ts.j2`,
      );
      await writeRender({
        outputDir: setupDir,
        templateFile,
      });
    }

    action = writeRender({
      templateFile,
      outputDir,
      ctx: {
        plugins,
        setupFileRelPath,
        srcRelPath,
        presetsRelPaths,
      },
    });
  }

  isOk = await tryAction(
    action,
    "generating the vitest config file",
    { fatal },
  );

  if (args.script) {
    const [result, error] = await tryCatch(
      findPkgJson({ startDir: outputDir }),
    );
    if (error) {
      isOk = false;
      showWarning(error, "reading the package.json file", true);
    } else {
      const [packageJson, packageJsonPath] = result;
      const configPath = relative(dirname(packageJsonPath), outputFile);
      packageJson.scripts = packageJson.scripts || {};

      const testCmd = configPath !== "vitest.config.ts"
        ? `vitest --config ${configPath} run`
        : "vitest run";

      let canWriteScript = true;

      if (packageJson.scripts.test) {
        canWriteScript = await confirm({
          message:
            "⚠️ You already have a test script, do you want to overwrite it? ⚠️",
          initialValue: false,
        });
      }

      packageJson.scripts.test = testCmd;

      if (canWriteScript) {
        isOk = await tryAction(
          writeJsonFile(packageJsonPath, packageJson),
          "writing the tests script to package.json",
          { fatal },
        );
      } else {
        log.info("Skipped writing the tests script.");
      }
    }
  }

  if (isOk) log.success("✅ Vitest config generated.");
}
