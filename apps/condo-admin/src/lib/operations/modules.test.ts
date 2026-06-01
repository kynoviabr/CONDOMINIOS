import { describe, expect, it } from "vitest";
import { canAccessOperationalModule, getAllowedOperationalModules } from "./modules";

describe("condo-admin operational modules", () => {
  it("exposes all operational modules to condominium administrators", () => {
    const modules = getAllowedOperationalModules("condominium_admin");

    expect(modules.map((module) => module.key)).toEqual([
      "settings",
      "units",
      "residents",
      "vehicles",
      "gates",
      "employees",
      "suppliers",
      "visitors",
      "invites",
      "doorman",
      "occurrences",
      "common_areas",
      "visitor_parking"
    ]);
  });

  it("restricts module access for operational support roles", () => {
    expect(canAccessOperationalModule("doorman_supervisor", "gates")).toBe(true);
    expect(canAccessOperationalModule("doorman_supervisor", "settings")).toBe(false);
    expect(canAccessOperationalModule("resident_manager", "residents")).toBe(true);
    expect(canAccessOperationalModule("resident_manager", "gates")).toBe(false);
    expect(getAllowedOperationalModules("tenant_admin")).toEqual([]);
  });

  it("keeps SaaS finance and Kynovia customer management out of Condo Admin", () => {
    const hrefs = getAllowedOperationalModules("condominium_admin").map((module) => module.href);

    expect(hrefs).not.toContain("/dashboard/finance");
    expect(hrefs).not.toContain("/dashboard/condominiums");
  });
});
