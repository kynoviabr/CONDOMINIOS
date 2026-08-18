import { describe, expect, it } from "vitest";
import {
  employeeDepartmentLabels,
  employeeDepartments,
  employeeStatusLabels,
  employeeStatuses,
  formatShift,
  formatWorkdays,
  isEmployeeDepartment,
  isEmployeeStatus,
  normalizeEmployeeName,
  parseEmployeeMetadata,
  sanitizeEmployeeSearch
} from "./employees";

describe("employees helpers", () => {
  it("validates departments and statuses correctly", () => {
    expect(employeeDepartments).toContain("maintenance");
    expect(employeeDepartments).toContain("gatehouse");
    expect(isEmployeeDepartment("gatehouse")).toBe(true);
    expect(isEmployeeDepartment("invalid")).toBe(false);

    expect(employeeStatuses).toContain("active");
    expect(employeeStatuses).toContain("vacation");
    expect(isEmployeeStatus("vacation")).toBe(true);
    expect(isEmployeeStatus("pending")).toBe(false);

    expect(employeeDepartmentLabels.gatehouse).toBe("Portaria / Controle de Acesso");
    expect(employeeStatusLabels.vacation).toBe("Em Férias");
  });

  it("normalizes and sanitizes employee inputs", () => {
    expect(normalizeEmployeeName("  Antônio Carlos Ferreira  ")).toBe(
      "Antônio Carlos Ferreira"
    );
    expect(sanitizeEmployeeSearch("Antônio% (Zelador, Geral)")).toBe("Antônio Zelador Geral");
  });

  it("formats workdays and shifts accurately", () => {
    expect(formatWorkdays([])).toBe("Nenhum dia");
    expect(formatWorkdays(null)).toBe("Nenhum dia");
    expect(formatWorkdays([2, 3, 4, 5, 6])).toBe("Seg a Sex (5x2)");
    expect(formatWorkdays([2, 3, 4, 5, 6, 7])).toBe("Seg a Sáb (6x1)");
    expect(formatWorkdays([1, 2, 3, 4, 5, 6, 7])).toBe("Escala 7x0 / Diário");
    expect(formatWorkdays([2, 4, 6])).toBe("Seg, Qua, Sex");

    expect(formatShift("07:00", "19:00")).toBe("07:00 às 19:00");
    expect(formatShift(null, null)).toBe("08:00 às 17:00");
  });

  it("parses employee metadata safely", () => {
    expect(parseEmployeeMetadata(null)).toEqual({});
    expect(parseEmployeeMetadata("invalid")).toEqual({});
    expect(
      parseEmployeeMetadata({
        badgeNumber: " ZEL-01 ",
        uniformSize: " G ",
        shiftType: " 12x36 ",
        notes: " Escala noturna alternada "
      })
    ).toEqual({
      badgeNumber: "ZEL-01",
      uniformSize: "G",
      shiftType: "12x36",
      notes: "Escala noturna alternada"
    });
  });
});
