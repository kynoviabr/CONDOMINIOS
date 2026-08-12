import { describe, expect, it } from "vitest";
import {
  isResidentVehicleStatus,
  isResidentVehicleType,
  residentVehicleStatuses,
  residentVehicleTypes,
  sanitizeVehicleSearch
} from "./vehicles";

describe("resident vehicle contracts", () => {
  it("accepts only supported vehicle types", () => {
    expect(residentVehicleTypes).toEqual([
      "automobile",
      "motorcycle",
      "bicycle",
      "van",
      "truck"
    ]);
    expect(isResidentVehicleType("motorcycle")).toBe(true);
    expect(isResidentVehicleType("bus")).toBe(false);
  });

  it("accepts only supported statuses", () => {
    expect(residentVehicleStatuses).toEqual(["active", "inactive", "blocked"]);
    expect(isResidentVehicleStatus("blocked")).toBe(true);
    expect(isResidentVehicleStatus("pending")).toBe(false);
  });

  it("sanitizes PostgREST filter control characters and limits input", () => {
    expect(sanitizeVehicleSearch("  ABC1D23%, (Fiat)  ")).toBe("ABC1D23 Fiat");
    expect(sanitizeVehicleSearch("a".repeat(100))).toHaveLength(80);
  });
});
