import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import {
  confirm,
  isAboveCwd,
  promptIfPathIsAboveCwd,
  throwIfPathIsAboveCwd,
} from "../../src/index.js";

const absoluteCheck = resolve(process.cwd(), "..");

it("recognizes paths above the cwd", async () => {
  const check = isAboveCwd("../");
  expect(check).toBe(true);

  const checkAbsolute = isAboveCwd(absoluteCheck);
  expect(checkAbsolute).toBe(true);

  const checkDot = isAboveCwd(".");
  expect(checkDot).toBe(false);

  const checkAbsoluteDot = isAboveCwd(resolve("."));
  expect(checkAbsoluteDot).toBe(false);
});

it("asks confirmation if the path is above the cwd", async () => {
  vi.mock("../../src/prompts.js", () => {
    return {
      confirm: vi.fn(() => {
        return true;
      }),
    };
  });

  await promptIfPathIsAboveCwd("..");
  expect(confirm).toHaveBeenCalled();

  await promptIfPathIsAboveCwd(absoluteCheck);
  expect(confirm).toHaveBeenCalled();
});

it("throws is the path is above the cwd", async () => {
  await expect(async () => throwIfPathIsAboveCwd("..", "testing")).rejects
    .toThrow();

  await expect(async () => throwIfPathIsAboveCwd(absoluteCheck, "testing"))
    .rejects
    .toThrow();
});
