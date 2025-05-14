import { describe } from "vitest";
import { initRepo } from "../src/init_repo.js";
import { checkDirResolutionCli } from "./lib/memfs.js";

const action = initRepo;

const baseFlags = [
  "-n",
  "mytestrepo",
  "--lint-name",
  "testlint",
  "--catalog",
  "--moon",
  "--no-install",
  "--default-packages",
];

describe("testing the init-repo cli", async () => {
  checkDirResolutionCli({
    action,
    outputPath: "package.json",
    flags: baseFlags,
  });
});
