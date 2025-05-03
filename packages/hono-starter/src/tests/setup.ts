import { afterAll, beforeAll, vi } from "vitest";

beforeAll(() => {
  vi.mock("../lib/env", () => {
    return {
      default: {
        NODE_ENV: "test",
        DATABASE_URL: "",
        LOG_LEVEL: "debug",
      },
    };
  });
});

afterAll(() => {});
