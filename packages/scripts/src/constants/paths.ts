import { findDirectories } from "@monorepo-starter/utils";
import { type } from "arktype";
import { findUpSync } from "find-up";
import { dirname } from "node:path";

const curdir = import.meta.dirname;

const string = type("string");

const rootMarker = string.assert(findUpSync("pnpm-workspace.yaml", {
  type: "file",
  cwd: curdir,
}));

export const monorepoRoot = dirname(rootMarker);

const directories = ["templates"] as const;

export const localDirs = await findDirectories(directories, { cwd: curdir });
