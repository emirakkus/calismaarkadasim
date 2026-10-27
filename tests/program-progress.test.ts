import { describe, expect, it } from "vitest";
import { programProgressPercent } from "../src/lib/program-progress";

describe("programProgressPercent", () => {
  it("combines completed topics and daily tasks", () => {
    expect(programProgressPercent(2, 1, 2, 1)).toBe(50);
  });

  it("returns zero when there is no program data", () => {
    expect(programProgressPercent(0, 0, 0, 0)).toBe(0);
  });
});
