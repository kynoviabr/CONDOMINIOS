export const supplierCategories = [
  "maintenance",
  "cleaning",
  "security",
  "gardening",
  "construction",
  "telecom",
  "delivery",
  "other"
] as const;

export type SupplierCategory = (typeof supplierCategories)[number];

export const supplierCategoryLabels: Record<SupplierCategory, string> = {
  construction: "Obras / Reformas",
  cleaning: "Limpeza / Conservação",
  delivery: "Entregas / Cargas",
  gardening: "Jardinagem / Paisagismo",
  maintenance: "Manutenção Geral / Elevadores",
  other: "Outros Serviços",
  security: "Segurança / CFTV",
  telecom: "Telecom / Internet"
};

export const supplierStatuses = ["active", "inactive", "blocked"] as const;

export type SupplierStatus = (typeof supplierStatuses)[number];

export const supplierStatusLabels: Record<SupplierStatus, string> = {
  active: "Ativo",
  blocked: "Bloqueado",
  inactive: "Inativo"
};

export const weekdayLabels: Record<number, string> = {
  1: "Dom",
  2: "Seg",
  3: "Ter",
  4: "Qua",
  5: "Qui",
  6: "Sex",
  7: "Sáb"
};

export type SupplierMetadata = {
  contractNumber?: string;
  notes?: string;
};

export function isSupplierCategory(value: string): value is SupplierCategory {
  return supplierCategories.includes(value as SupplierCategory);
}

export function isSupplierStatus(value: string): value is SupplierStatus {
  return supplierStatuses.includes(value as SupplierStatus);
}

export function normalizeSupplierName(value: string): string {
  return value.trim().slice(0, 120);
}

export function sanitizeSupplierSearch(value: string): string {
  return value.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function formatAllowedWeekdays(days: number[] | null | undefined): string {
  if (!days || days.length === 0) {
    return "Nenhum dia";
  }

  if (days.length === 7) {
    return "Todos os dias";
  }

  // Common patterns
  const sorted = [...days].sort((a, b) => a - b);
  const isBusinessDays = sorted.length === 5 && sorted.every((d, i) => d === i + 2); // 2,3,4,5,6 (Seg-Sex)
  if (isBusinessDays) {
    return "Seg a Sex";
  }

  return sorted.map((d) => weekdayLabels[d] ?? d).join(", ");
}

export function formatAllowedSchedule(start?: string | null, end?: string | null): string {
  const s = start?.trim() || "08:00";
  const e = end?.trim() || "18:00";
  if (s === "00:00" && e === "23:59") {
    return "24 horas";
  }
  return `${s} às ${e}`;
}

export function parseSupplierMetadata(metadata: unknown): SupplierMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const raw = metadata as Record<string, unknown>;
  const contractNumber =
    typeof raw.contractNumber === "string" && raw.contractNumber.trim()
      ? raw.contractNumber.trim()
      : undefined;
  const notes = typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim() : undefined;

  return {
    contractNumber,
    notes
  };
}
