export const unitTypes = ["apartment", "house", "commercial", "other"] as const;

export type UnitType = (typeof unitTypes)[number];

export type UnitMetadata = {
  intercom?: string;
  notes?: string;
  parkingSpaces?: string;
  unitType?: UnitType;
};

export function isUnitType(value: string): value is UnitType {
  return unitTypes.includes(value as UnitType);
}

export function normalizeUnitNumber(value: string): string {
  return value.trim().slice(0, 30);
}

export function normalizeUnitBlock(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 30);
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeUnitFloor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 30);
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeUnitSearch(value: string): string {
  return value.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function parseUnitMetadata(metadata: unknown): UnitMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const raw = metadata as Record<string, unknown>;
  const intercom = typeof raw.intercom === "string" && raw.intercom.trim() ? raw.intercom.trim() : undefined;
  const notes = typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim() : undefined;
  const parkingSpaces =
    typeof raw.parkingSpaces === "string" && raw.parkingSpaces.trim() ? raw.parkingSpaces.trim() : undefined;
  const unitType =
    typeof raw.unitType === "string" && isUnitType(raw.unitType) ? (raw.unitType as UnitType) : undefined;

  return {
    intercom,
    notes,
    parkingSpaces,
    unitType
  };
}

export function formatUnitFloorLabel(floor: string): string {
  const trimmed = floor.trim();
  if (!trimmed) return "";

  const numericMatch = trimmed.match(/^(\d+)\s*(?:[º°o]|º\s*andar|\s*andar)?$/i);
  if (numericMatch) {
    const num = numericMatch[1];
    return `${num}º andar`;
  }

  return trimmed;
}

export function formatUnitLabel(unit: { block?: string | null; number: string; floor?: string | null }): string {
  const parts: string[] = [];
  if (unit.block) {
    const trimmed = unit.block.trim();
    const hasPrefix = /^(bloco|quadra)\b/i.test(trimmed);
    parts.push(hasPrefix ? trimmed : `Bloco/Quadra ${trimmed}`);
  }
  parts.push(`Nº ${unit.number}`);
  if (unit.floor) {
    const formattedFloor = formatUnitFloorLabel(unit.floor);
    if (formattedFloor) {
      parts.push(formattedFloor);
    }
  }
  return parts.join(" · ");
}
