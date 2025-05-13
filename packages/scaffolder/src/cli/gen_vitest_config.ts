import { log } from "@clack/prompts";
import { Command, Option } from "@commander-js/extra-typings";
import {
  confirm,
  findPkgJson,
  promptIfFileExists,
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

export async function genVitestConfig(injectedArgs?: string[]) {
  const program = new Command()
    .option(
      "-d, --dir <directory>",
      "The directory for the generated file",
      process.cwd(),
    )
    .addOption(new Option("-p, --plugin <plugin...>"))
    .addOption(
      new Option("-u, --url <url>", "The url for the config file to download")
        .implies({
          kind: "from-url",
        }),
    )
    .option("-i, --install", "Install vitest and the selected plugins")
    .option("-s, --script", "Add vitest as the test script")
    .addOption(
      new Option(
        "-m, --package-manager <package_manager>",
        "The package manager to install tsdown with",
      ).choices(packageManagers).default("pnpm").implies({ install: true }),
    )
    .option(
      "--tests-dir [test_dir]",
      "Create a directory for tests at the specified path (relative to cwd, defaults to 'tests')",
    )
    .addOption(
      new Option(
        "--full",
        "Create a full setup, including a tests directory and a setup file",
      ),
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

  if (args.testsDir === true || args.full) {
    if (typeof args.testsDir !== "string") args.testsDir = "tests";
  }

  const outputDir = resolve(args.dir);
  const configFileInRoot = outputDir === process.cwd();
  const outputFile = join(outputDir, "vitest.config.ts");

  let isOk: boolean | undefined;

  if (!configFileInRoot) {
    isOk = await tryAction(
      mkdir(outputDir, { recursive: true }),
      `creating ${outputDir}`,
      { fatal },
    );
  }

  const setupFileRelPath = relative(
    outputDir,
    resolve(args.testsDir || "", "tests.setup.ts"),
  );

  const srcRelPath = relative(outputDir, "src");

  await promptIfFileExists(outputFile);

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

  if (args.testsDir) {
    isOk = await tryAction(
      mkdir(args.testsDir, { recursive: true }),
      "creating the tests directory",
      { fatal },
    );

    if (args.full) {
      isOk = await tryAction(
        writeRender({
          outputDir: args.testsDir,
          templateFile: resolve(
            import.meta.dirname,
            "../templates/tests/tests.setup.ts.j2",
          ),
          overwrite: false,
        }),
        "writing the tests.setup.ts file",
        { fatal },
      );
    }
  }

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

      const testCmd = !configFileInRoot && configPath !== "vitest.config.ts"
        ? `vitest --config ${configPath} run`
        : "vitest run";

      let canWriteScript = true;

      if (packageJson.scripts.test) {
        canWriteScript = await confirm({
          message:
            "You already have a test script, do you want to override it?",
          initialValue: false,
        });
      } else {
        packageJson.scripts.test = testCmd;
      }

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

    action = writeRender({
      templateFile,
      outputDir,
      ctx: {
        plugins,
        fullSetup: args.full,
        setupFileRelPath,
        srcRelPath,
      },
    });
  }

  isOk = await tryAction(
    action,
    "generating the vitest config file",
    { fatal },
  );

  if (isOk) log.success("✅ Vitest config generated.");
}
