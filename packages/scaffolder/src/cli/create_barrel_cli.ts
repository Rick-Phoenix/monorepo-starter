import { Command } from "@commander-js/extra-typings";
import { createBarrelFile } from "@monorepo-starter/utils";

export async function createBarrelCli(injectedArgs?: string[]) {
  const program = new Command()
    .option("-f, --file <name>", "The name of the barrel file", "index.ts")
    .option("-s, --src-dir <path>", "The path to the src directory")
    .option(
      "-g, --globs <glob_patterns...>",
      "The glob patterns to use to look for files to export (defaults to ['**/*.ts', '!index.ts'])",
    )
    .option("--debug", "Show the result of the glob search")
    .option("--silent", "Do not print a message at the end");

  if (injectedArgs) {
    program.parse(injectedArgs, { from: "user" });
  } else {
    program.parse();
  }

  const args = program.opts();

  const { file, srcDir, globs, debug, silent } = args;

  await createBarrelFile({
    outputFile: file,
    srcDir,
    globPatterns: globs,
    debug,
    silent,
  });
}
