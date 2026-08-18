import { describe, expect, it } from "vitest";
import {
  formatUnitLabel,
  isUnitType,
  normalizeUnitBlock,
  normalizeUnitFloor,
  normalizeUnitNumber,
  parseUnitMetadata,
  sanitizeUnitSearch,
  unitTypes
} from "./units";

describe("units helpers", () => {
  it("validates unit types correctly", () => {
    expect(unitTypes).toContain("apartment");
    expect(unitTypes).toContain("house");
    expect(unitTypes).toContain("commercial");
    expect(isUnitType("apartment")).toBe(true);
    expect(isUnitType("house")).toBe(true);
    expect(isUnitType("penthouse")).toBe(false);
  });

  it("normalizes unit numbers, blocks and floors", () => {
    expect(normalizeUnitNumber("  102-A  ")).toBe("102-A");
    expect(normalizeUnitBlock("  Bloco 1  ")).toBe("Bloco 1");
    expect(normalizeUnitBlock("   ")).toBeNull();
    expect(normalizeUnitBlock(null)).toBeNull();
    expect(normalizeUnitFloor("  3  ")).toBe("3");
    expect(normalizeUnitFloor(undefined)).toBeNull();
  });

  it("sanitizes unit search query", () => {
    expect(sanitizeUnitSearch("101% (Bloco A)")).toBe("101 Bloco A");
  });

  it("parses unit metadata safely", () => {
    expect(parseUnitMetadata(null)).toEqual({});
    expect(parseUnitMetadata("invalid")).toEqual({});
    expect(
      parseUnitMetadata({
        intercom: " 1012 ",
        parkingSpaces: " Vaga 12 ",
        unitType: "apartment",
        notes: " Proprietário viaja frequentemente "
      })
    ).toEqual({
      intercom: "1012",
      parkingSpaces: "Vaga 12",
      unitType: "apartment",
      notes: "Proprietário viaja frequentemente"
    });
  });

  it("formats unit label accurately", () => {
    expect(formatUnitLabel({ number: "101" })).toBe("Nº 101");
    expect(formatUnitLabel({ block: "A", number: "101" })).toBe("Bloco/Quadra A · Nº 101");
    expect(formatUnitLabel({ block: "Bloco B", number: "202", floor: "2" })).toBe("Bloco B · Nº 202 · 2º andar");
    expect(formatUnitLabel({ block: "Quadra 4", number: "12", floor: "1" })).toBe("Quadra 4 · Nº 12 · 1º andar");
  });

  it("formats floor labels correctly according to floor rules", () => {
    // 1. "2" deve resultar em "2º andar"
    expect(formatUnitLabel({ number: "201", floor: "2" })).toBe("Nº 201 · 2º andar");

    // 2. "2º" deve resultar em "2º andar"
    expect(formatUnitLabel({ number: "201", floor: "2º" })).toBe("Nº 201 · 2º andar");
    expect(formatUnitLabel({ number: "201", floor: "2°" })).toBe("Nº 201 · 2º andar");
    expect(formatUnitLabel({ number: "201", floor: "2o" })).toBe("Nº 201 · 2º andar");

    // 3. "Cobertura" deve resultar em "Cobertura"
    expect(formatUnitLabel({ number: "PH1", floor: "Cobertura" })).toBe("Nº PH1 · Cobertura");

    // 4. valores textuais não devem receber o sufixo "º andar"
    expect(formatUnitLabel({ number: "01", floor: "Térreo" })).toBe("Nº 01 · Térreo");
    expect(formatUnitLabel({ number: "S01", floor: "Subsolo" })).toBe("Nº S01 · Subsolo");
    expect(formatUnitLabel({ number: "M01", floor: "Mezanino" })).toBe("Nº M01 · Mezanino");
  });
});
