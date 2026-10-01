import { describe, expect, it } from "vitest";
import { healthSnapshotSchema, parseHealthSnapshot } from "../health";

describe("health contract", () => {
  it("accepts the canonical ready snapshot", () => {
    expect(parseHealthSnapshot({ status: "ready", service: "atia" })).toEqual({
      status: "ready",
      service: "atia",
    });
  });

  it("rejects unknown status values", () => {
    expect(() =>
      healthSnapshotSchema.parse({ status: "maybe", service: "atia" }),
    ).toThrow();
  });
});
