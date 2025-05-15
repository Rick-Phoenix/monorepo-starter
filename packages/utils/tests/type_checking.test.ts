import {
  assertErrorWithMsg,
  assertIsObject,
  isENOENTError,
  isENOTDIRError,
  isNodeError,
  isNonEmptyArray,
  isPermissionError,
  isRunningInBrowser,
} from "../src/index.js";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("utility Functions", () => {
  it("recognizes an empty array", async () => {
    const notAnArray = isNonEmptyArray("not an array");
    expect(notAnArray).toBe(false);

    const emptyArray = isNonEmptyArray([]);
    expect(emptyArray).toBe(false);

    const nonEmptyArray = isNonEmptyArray(["test"]);
    expect(nonEmptyArray).toBe(true);
  });
  // Store original globalThis properties to restore them later
  let originalWindow: Window & typeof globalThis;
  let originalDocument: Document;

  beforeEach(() => {
    // Backup original window and document
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    // Restore original window and document
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    // Restore any mocks created with vi.spyOn
    vi.restoreAllMocks();
  });

  describe("isRunningInBrowser", () => {
    it("should return true when window and document are defined", () => {
      globalThis.window = {
        document: {},
      } as Window & typeof globalThis;
      expect(isRunningInBrowser()).toBe(true);
    });

    it("should return false when window is undefined", () => {
      // @ts-expect-error - Intentionally setting for test
      delete globalThis.window;
      globalThis.document = {} as Document;
      expect(isRunningInBrowser()).toBe(false);
    });

    it("should return false when document is undefined", () => {
      globalThis.window = {} as Window & typeof globalThis;
      // @ts-expect-error - Intentionally setting for test
      delete globalThis.document;
      expect(isRunningInBrowser()).toBe(false);
    });

    it("should return false when both window and document are undefined", () => {
      // @ts-expect-error - Intentionally setting for test
      delete globalThis.window;
      // @ts-expect-error - Intentionally setting for test
      delete globalThis.document;
      expect(isRunningInBrowser()).toBe(false);
    });
  });

  describe("assertIsObject", () => {
    it("should return true for valid objects and not throw", () => {
      const obj = { a: 1 };
      expect(assertIsObject(obj)).toBe(true);
    });

    it("should throw an error for null", () => {
      expect(() => assertIsObject(null)).toThrow(
        "Caught value is not an object: null",
      );
    });

    it("should throw an error for string primitives", () => {
      expect(() => assertIsObject("hello")).toThrow(
        "Caught value is not an object: hello",
      );
    });

    it("should throw an error for number primitives", () => {
      expect(() => assertIsObject(123)).toThrow(
        "Caught value is not an object: 123",
      );
    });

    it("should throw an error for boolean primitives", () => {
      expect(() => assertIsObject(true)).toThrow(
        "Caught value is not an object: true",
      );
    });

    it("should throw an error for undefined", () => {
      expect(() => assertIsObject(undefined)).toThrow(
        "Caught value is not an object: undefined",
      );
    });

    it("should throw an error for arrays", () => {
      expect(() => assertIsObject([])).toThrow(
        "Caught value is not an object: ",
      );
    });
  });

  describe("assertErrorWithMsg", () => {
    it("should return true for objects with a message property and not throw", () => {
      const err = { message: "An error occurred" };
      expect(assertErrorWithMsg(err)).toBe(true);
    });

    it("should throw an error for objects without a message property", () => {
      const val = { code: "ENOENT" };
      expect(() => assertErrorWithMsg(val)).toThrow(
        `Caught value is not an object: ${String(val)}`,
      );
    });

    it("should throw for null", () => {
      expect(() => assertErrorWithMsg(null)).toThrow(
        "Caught value is not an object: null",
      );
    });

    it("should throw for string primitives", () => {
      expect(() => assertErrorWithMsg("a string")).toThrow(
        "Caught value is not an object: a string",
      );
    });
  });

  describe("isNodeError", () => {
    it("should return true for objects with a string code property", () => {
      const err = { code: "ENOENT", message: "File not found" };
      expect(isNodeError(err)).toBe(true);
    });

    it("should return false for objects where code is not a string", () => {
      const err = { code: 123, message: "Some error" };
      expect(isNodeError(err)).toBe(false);
    });

    it("should return false for objects without a code property", () => {
      const err = { message: "Some error" };
      // This will throw due to assertIsObject if message is not present,
      // but if message is present, assertErrorWithMsg would pass, but isNodeError would fail on `error.code`
      // For isNodeError, we only care about assertIsObject and error.code
      expect(isNodeError(err)).toBe(false);
    });

    it("should throw for null (due to assertIsObject)", () => {
      expect(() => isNodeError(null)).toThrow(
        "Caught value is not an object: null",
      );
    });

    it("should throw for primitives (due to assertIsObject)", () => {
      expect(() => isNodeError("string")).toThrow(
        "Caught value is not an object: string",
      );
    });
  });

  describe("error Type Guards (isPermissionError, isENOENTError, isENOTDIRError)", () => {
    const createError = (code?: string, otherProps = {}): any => {
      if (code !== undefined) {
        return { code, ...otherProps };
      }
      return { ...otherProps };
    };

    describe("isPermissionError", () => {
      it("should return true for EACCESS", () => {
        expect(isPermissionError(createError("EACCESS"))).toBe(true);
      });
      it("should return true for EPERM", () => {
        expect(isPermissionError(createError("EPERM"))).toBe(true);
      });
      it("should return false for other codes", () => {
        expect(isPermissionError(createError("ENOENT"))).toBe(false);
      });
      it("should return false if not a NodeError", () => {
        expect(isPermissionError(createError(undefined, { message: "hi" })))
          .toBe(false);
        expect(isPermissionError({ code: 123 })).toBe(false);
      });
      it("should throw for non-objects", () => {
        expect(() => isPermissionError(null)).toThrow();
      });
    });

    describe("isENOENTError", () => {
      it("should return true for ENOENT", () => {
        expect(isENOENTError(createError("ENOENT"))).toBe(true);
      });
      it("should return false for other codes", () => {
        expect(isENOENTError(createError("EACCESS"))).toBe(false);
      });
      it("should return false if not a NodeError", () => {
        expect(isENOENTError({ message: "hi" })).toBe(false);
      });
      it("should throw for non-objects", () => {
        expect(() => isENOENTError(null)).toThrow();
      });
    });

    describe("isENOTDIRError", () => {
      it("should return true for ENOTDIR", () => {
        expect(isENOTDIRError(createError("ENOTDIR"))).toBe(true);
      });
      it("should return false for other codes", () => {
        expect(isENOTDIRError(createError("ENOENT"))).toBe(false);
      });
      it("should return false if not a NodeError", () => {
        expect(isENOTDIRError({ message: "hi" })).toBe(false);
      });
      it("should throw for non-objects", () => {
        expect(() => isENOTDIRError(null)).toThrow();
      });
    });
  });
});
