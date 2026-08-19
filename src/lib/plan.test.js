import { describe, it, expect } from "vitest";
import { isProPlan } from "./plan";

describe("isProPlan", () => {
  it("returns true when plan is 'pro'", () => {
    expect(isProPlan({ plan: "pro" })).toBe(true);
  });

  it("returns true for an admin, regardless of plan", () => {
    expect(isProPlan({ plan: "free", role: "admin" })).toBe(true);
    expect(isProPlan({ plan: "free", is_admin: true })).toBe(true);
  });

  it("is falsy for a plain free-plan profile (the OR chain returns the last falsy operand, not necessarily literal false)", () => {
    expect(isProPlan({ plan: "free" })).toBeFalsy();
  });

  it("returns falsy rather than throwing when profile is null/undefined", () => {
    expect(isProPlan(null)).toBeFalsy();
    expect(isProPlan(undefined)).toBeFalsy();
  });
});
