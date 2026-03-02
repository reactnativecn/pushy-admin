import { expect, test, describe } from "bun:test";
import { isExpVersion } from "./helper";

describe("isExpVersion", () => {
  test("should return false when config is null", () => {
    expect(isExpVersion(null, "1.0.0")).toBe(false);
  });

  test("should return false when config is undefined", () => {
    expect(isExpVersion(undefined, "1.0.0")).toBe(false);
  });

  test("should return false when config.rollout is missing", () => {
    // @ts-ignore
    expect(isExpVersion({}, "1.0.0")).toBe(false);
  });

  test("should return false when rollout config for version is missing", () => {
    expect(isExpVersion({ rollout: {} }, "1.0.0")).toBe(false);
  });

  test("should return false when rollout config for version is null", () => {
    expect(isExpVersion({ rollout: { "1.0.0": null } }, "1.0.0")).toBe(false);
  });

  test("should return true when rollout is less than 100", () => {
    expect(isExpVersion({ rollout: { "1.0.0": 50 } }, "1.0.0")).toBe(true);
    expect(isExpVersion({ rollout: { "1.0.0": 0 } }, "1.0.0")).toBe(true);
  });

  test("should return false when rollout is 100", () => {
    expect(isExpVersion({ rollout: { "1.0.0": 100 } }, "1.0.0")).toBe(false);
  });

  test("should return false when rollout is greater than 100", () => {
    expect(isExpVersion({ rollout: { "1.0.0": 110 } }, "1.0.0")).toBe(false);
  });
});
