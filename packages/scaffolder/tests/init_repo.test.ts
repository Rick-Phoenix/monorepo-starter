import { describe, it } from "vitest";
import { initRepo } from "../src/cli/init_repo.js";
import { checkJsonOutput, checkYamlOutput } from "./lib/memfs.js";

const action = initRepo;

const repoName = "mytestrepo";
const baseFlags = [
  "-n",
  repoName,
  "-d",
  repoName,
  "--lint-name",
  "testlint",
  "--catalog",
  "--moon",
  "--no-install",
  "--default-packages",
  "--git-hook",
  "-a",
  "vitest",
];

describe("testing the init-repo cli", async () => {
  it("creates the config files", async () => {
    await action(baseFlags);
    checkJsonOutput(
      {
        outputFile: "mytestrepo/package.json",
        checks: [
          {
            property: "name",
            expected: repoName,
          },
          {
            expected: "catalog:",
            property: "devDependencies.typescript",
          },
          {
            expected: "catalog:",
            property: "devDependencies.husky",
          },
          {
            property: "devDependencies.vitest",
            expected: "catalog:",
          },
        ],
      },
    );

    checkYamlOutput({
      outputFile: "mytestrepo/pnpm-workspace.yaml",
      kind: "typeof",
      property: "catalog.typescript",
      expected: "string",
    });
  });
});
