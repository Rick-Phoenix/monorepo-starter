import { describe, expect, it } from "vitest";
import {
  ensureArrayProperty,
  ensureObjectProperty,
  getValue,
} from "../../src/index.js";

describe("testing getValue", async () => {
  it("gets nested fields", async () => {
    const testObject = {
      something: [["", [1, 2, "target", { prop: "target2" }]]],
    };
    const check1 = getValue(
      testObject,
      "something[0][1][2]",
    );

    expect(check1).toBe("target");

    const check2 = getValue(testObject, "something[0][1][3].prop");

    expect(check2).toBe("target2");
  });

  it("supports plain number syntax", async () => {
    const testArray = [[0, [{ prop: "target" }]]];

    const check = getValue(testArray, "0.1.0.prop");
    expect(check).toBe("target");
  });

  it("supports square bracket syntax", async () => {
    const testArray = [[0, [{ prop: "target" }]]];

    const check = getValue(testArray, "[0].[1].[0].prop");
    expect(check).toBe("target");
  });

  it("supports mixed syntax", async () => {
    const testArray = [[0, [{ prop: "target" }]]];

    const check = getValue(testArray, "0.[1].0.prop");
    expect(check).toBe("target");

    const check2 = getValue(testArray, "[0].1.[0].prop");
    expect(check2).toBe("target");
  });

  it("respects non-index numbers", async () => {
    const testArray = [[0, [{ prop1: ["target"] }]]];

    const check = getValue(testArray, "0.[1].0.prop1.0");
    expect(check).toBe("target");
  });

  it("retrieves deeply nested values", async () => {
    const testObject = { prop1: [{ prop2: { prop3: [{ prop4: "target" }] } }] };

    const check = getValue(testObject, "prop1[0].prop2.prop3.0.prop4");

    expect(check).toBe("target");
  });

  it("generates a missing object property", async () => {
    const testObj = {};

    const result = ensureObjectProperty(testObj, "objProp");

    expect(result).toBeTypeOf("object");
    //@ts-expect-error Testing
    expect(testObj.objProp).toBeTypeOf("object");
  });

  it("generates a missing array property", async () => {
    const testObj = {};

    const result = ensureArrayProperty(testObj, "objProp");

    expect(result).toBeInstanceOf(Array);
    //@ts-expect-error Testing
    expect(testObj.objProp).toBeInstanceOf(Array);
  });
});
