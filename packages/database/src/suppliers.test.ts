import { describe, expect, it } from "vitest";
import {
  formatAllowedSchedule,
  formatAllowedWeekdays,
  isSupplierCategory,
  isSupplierStatus,
  normalizeSupplierName,
  parseSupplierMetadata,
  sanitizeSupplierSearch,
  supplierCategories,
  supplierCategoryLabels,
  supplierStatuses
} from "./suppliers";

describe("suppliers helpers", () => {
  it("validates categories and statuses correctly", () => {
    expect(supplierCategories).toContain("maintenance");
    expect(supplierCategories).toContain("cleaning");
    expect(isSupplierCategory("maintenance")).toBe(true);
    expect(isSupplierCategory("invalid_category")).toBe(false);

    expect(supplierStatuses).toContain("active");
    expect(supplierStatuses).toContain("blocked");
    expect(isSupplierStatus("active")).toBe(true);
    expect(isSupplierStatus("pending")).toBe(false);

    expect(supplierCategoryLabels.maintenance).toBe("Manutenção Geral / Elevadores");
  });

  it("normalizes and sanitizes supplier inputs", () => {
    expect(normalizeSupplierName("  Elevadores Atlas Schindler  ")).toBe(
      "Elevadores Atlas Schindler"
    );
    expect(sanitizeSupplierSearch("Atlas% (Schindler, Ltda)")).toBe("Atlas Schindler Ltda");
  });

  it("formats allowed weekdays nicely", () => {
    expect(formatAllowedWeekdays([])).toBe("Nenhum dia");
    expect(formatAllowedWeekdays(null)).toBe("Nenhum dia");
    expect(formatAllowedWeekdays([1, 2, 3, 4, 5, 6, 7])).toBe("Todos os dias");
    expect(formatAllowedWeekdays([2, 3, 4, 5, 6])).toBe("Seg a Sex");
    expect(formatAllowedWeekdays([2, 4, 6])).toBe("Seg, Qua, Sex");
  });

  it("formats allowed schedule nicely", () => {
    expect(formatAllowedSchedule("08:00", "18:00")).toBe("08:00 às 18:00");
    expect(formatAllowedSchedule("00:00", "23:59")).toBe("24 horas");
    expect(formatAllowedSchedule(null, null)).toBe("08:00 às 18:00");
  });

  it("parses supplier metadata safely", () => {
    expect(parseSupplierMetadata(null)).toEqual({});
    expect(parseSupplierMetadata("invalid")).toEqual({});
    expect(
      parseSupplierMetadata({
        contractNumber: " CT-2026-01 ",
        notes: " Atendimento emergencial 24h "
      })
    ).toEqual({
      contractNumber: "CT-2026-01",
      notes: "Atendimento emergencial 24h"
    });
  });
});
