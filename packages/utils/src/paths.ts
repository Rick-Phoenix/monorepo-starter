import { select } from "@clack/prompts";
import fg, { type Options } from "fast-glob";
import { access, constants } from "node:fs/promises";
import { basename } from "node:path";
import { stringType } from "./arktype.js";
import { tryThrow } from "./error-handling.js";

export async function checkPath(filePath: string) {
  const baseName = basename(filePath);
  await tryThrow(
    access(filePath, constants.F_OK),
    `checking the path for ${baseName} (input was ${filePath})`,
  );
}

export async function findPaths<T extends readonly string[]>(
  paths: T,
  options?: Options & { excludedDirs?: string[]; includeNodeModules?: boolean },
): Promise<Record<T[number], string>> {
  type PathKeys = typeof paths[number];

  const pathsInitial: { [key: string]: string } = {};

  const { excludedDirs = [], includeNodeModules, ...fgOpts } = options ?? {};

  const fgExcludes = excludedDirs.map((d) => `!**/${d}`);

  if (!includeNodeModules && !excludedDirs.includes("node_modules")) {
    fgExcludes.push("!**/node_modules");
  }

  const defaults = {
    absolute: true,
  };

  for (const path of paths) {
    const entries = await fg([
      `**/${path}`,
      ...fgExcludes,
    ], { ...defaults, ...fgOpts });

    if (!entries.length) {
      throw new Error(
        `Could not find any matches for the directory '${path}'.`,
      );
    }

    let dirPath: string | undefined;

    if (entries.length > 1) {
      const choice = await select({
        message:
          `Found ${entries.length} matches for the directory '${path}'. Choose the correct one.`,
        options: [
          ...entries.map((entry) => ({
            value: entry,
            label: entry,
          })),
          { value: "exit", label: "Exit the script" },
        ],
      });

      if (typeof choice !== "string" || choice === "exit") {
        // eslint-disable-next-line no-console
        console.log("Operation cancelled.");
        process.exit(1);
      }

      dirPath = stringType.assert(choice);
    } else {
      dirPath = stringType.assert(entries[0]);
    }

    pathsInitial[path] = dirPath;
  }

  type PathsOutput = { [K in PathKeys]: string };
  const pathsFinal: PathsOutput = pathsInitial as PathsOutput;

  return pathsFinal;
}

export async function findDirectories<T extends readonly string[]>(
  paths: T,
  options?: Options & { excludedDirs?: string[]; includeNodeModules?: boolean },
) {
  return findPaths(paths, { ...options, onlyDirectories: true });
}

export async function findFiles<T extends readonly string[]>(
  paths: T,
  options?: Options & { excludedDirs?: string[]; includeNodeModules?: boolean },
) {
  return findPaths(paths, { ...options, onlyFiles: true });
}
