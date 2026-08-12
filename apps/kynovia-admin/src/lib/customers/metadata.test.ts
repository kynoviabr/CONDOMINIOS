import { describe, expect, it } from "vitest";
import {
  contractExpiresWithinDays,
  forbiddenKynoviaAdminOperationalModules,
  isValidCnpjFormat,
  kynoviaAdminNavigation,
  monthlyValue,
  moneyValue,
  normalizePhoneFormat
} from "./metadata";

describe("Kynovia Condo Admin customer metadata", () => {
  it("validates formatted CNPJ values", () => {
    expect(isValidCnpjFormat("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpjFormat("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpjFormat("00.000.000/0000-00")).toBe(false);
  });

  it("normalizes monetary values for MRR", () => {
    expect(moneyValue("1.250,50")).toBe(1250.5);
    expect(monthlyValue({ contract: { monthly_value: 990 } })).toBe(990);
    expect(monthlyValue({})).toBe(0);
  });

  it("normalizes Brazilian mobile phone values", () => {
    expect(normalizePhoneFormat("11999990000")).toBe("(11) 99999-0000");
    expect(normalizePhoneFormat("+55 (11) 99999-0000")).toBe("(11) 99999-0000");
    expect(normalizePhoneFormat("(11) 99999-0000")).toBe("(11) 99999-0000");
    expect(normalizePhoneFormat("1199990000")).toBe("1199990000");
  });

  it("detects contracts expiring in the next 60 days", () => {
    const now = new Date("2026-05-22T12:00:00");

    expect(contractExpiresWithinDays({ contract: { expires_at: "2026-07-10" } }, 60, now)).toBe(true);
    expect(contractExpiresWithinDays({ contract: { expires_at: "2026-08-01" } }, 60, now)).toBe(false);
  });

  it("keeps Kynovia Condo Admin navigation separated from operational modules", () => {
    expect(kynoviaAdminNavigation.map((item) => item.label)).toEqual([
      "Dashboard",
      "Gestão de Clientes",
      "Gestão de Usuários"
    ]);
    expect(forbiddenKynoviaAdminOperationalModules).toContain("moradores");
    expect(kynoviaAdminNavigation.some((item) => item.label.toLowerCase().includes("morador"))).toBe(false);
  });
});
