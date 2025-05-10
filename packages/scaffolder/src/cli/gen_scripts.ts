import { log } from "@clack/prompts";
import { Command, Option } from "@commander-js/extra-typings";
import {
  promptIfFileExists,
  tryAction,
  writeRender,
} from "@monorepo-starter/utils";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

export const scriptsPresets = ["barrel"];

export async function genScriptsSetup(injectedArgs?: string[]) {
  const program = new Command()
    .option(
      "-d, --dir <directory>",
      "The relative path to the scripts folder to generate",
      "scripts",
    )
    .addOption(
      new Option(
        "-p, --preset <preset...>",
        "Include these presets into the scripts folder",
      ).choices(scriptsPresets),
    )
    .addOption(
      new Option(
        "-m, --moon",
        "Generate a moon.yml file with the selected tasks",
      ),
    )
    .showHelpAfterError();

  const isRunningAsCli = !injectedArgs;
  const fatal = isRunningAsCli;

  if (!isRunningAsCli) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const args = program.opts();

  const outputDir = resolve(args.dir);

  let isOk: boolean | undefined;

  isOk = await tryAction(
    mkdir(outputDir, { recursive: true }),
    "creating the scripts directory",
    { fatal },
  );

  if (args.preset) {
    for (const preset of args.preset) {
      const outputFile = `${preset}.ts`;
      const templateFile = resolve(
        import.meta.dirname,
        `../templates/scripts/${outputFile}.j2`,
      );
      await promptIfFileExists(join(outputDir, outputFile));
      isOk = await tryAction(
        writeRender({ templateFile, outputDir }),
        `writing the ${outputFile} to ${outputDir}`,
        { fatal },
      );
    }

    if (args.moon) {
      const nunjucksRoot = resolve(import.meta.dirname, "../templates/moon");
      const outputFile = "moon.yml";
      const outputDir = process.cwd();
      await promptIfFileExists(join(outputDir, outputFile));
      const templateFile = `${outputFile}.j2`;
      const tasks: Record<string, boolean> = {};

      args.preset.forEach((p) => {
        tasks[p] = true;
      });

      isOk = await tryAction(
        writeRender({
          outputDir,
          nunjucksRoot,
          templateFile,
          ctx: { tasks },
        }),
        `writing the ${outputFile} to ${outputDir}`,
        { fatal },
      );
    }
  }

  if (isOk) log.success("✅ Scripts setup completed");
}
