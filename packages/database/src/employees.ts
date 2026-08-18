import { weekdayLabels } from "./suppliers";

export const employeeDepartments = [
  "administration",
  "gatehouse",
  "maintenance",
  "cleaning",
  "security",
  "general"
] as const;

export type EmployeeDepartment = (typeof employeeDepartments)[number];

export const employeeDepartmentLabels: Record<EmployeeDepartment, string> = {
  administration: "Administração / Síndico",
  cleaning: "Limpeza / Conservação",
  gatehouse: "Portaria / Controle de Acesso",
  general: "Geral / Apoio",
  maintenance: "Manutenção / Zeladoria",
  security: "Segurança / Ronda"
};

export const employeeStatuses = ["active", "inactive", "vacation", "terminated"] as const;

export type EmployeeStatus = (typeof employeeStatuses)[number];

export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  terminated: "Desligado",
  vacation: "Em Férias"
};

export type EmployeeMetadata = {
  badgeNumber?: string;
  notes?: string;
  shiftType?: string;
  uniformSize?: string;
};

export function isEmployeeDepartment(value: string): value is EmployeeDepartment {
  return employeeDepartments.includes(value as EmployeeDepartment);
}

export function isEmployeeStatus(value: string): value is EmployeeStatus {
  return employeeStatuses.includes(value as EmployeeStatus);
}

export function normalizeEmployeeName(value: string): string {
  return value.trim().slice(0, 120);
}

export function sanitizeEmployeeSearch(value: string): string {
  return value.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function formatWorkdays(days: number[] | null | undefined): string {
  if (!days || days.length === 0) {
    return "Nenhum dia";
  }

  if (days.length === 7) {
    return "Escala 7x0 / Diário";
  }

  const sorted = [...days].sort((a, b) => a - b);
  const isBusinessDays = sorted.length === 5 && sorted.every((d, i) => d === i + 2); // 2,3,4,5,6 (Seg a Sex)
  if (isBusinessDays) {
    return "Seg a Sex (5x2)";
  }

  const is6x1 = sorted.length === 6 && sorted.every((d, i) => d === i + 2); // 2,3,4,5,6,7 (Seg a Sab)
  if (is6x1) {
    return "Seg a Sáb (6x1)";
  }

  return sorted.map((d) => weekdayLabels[d] ?? d).join(", ");
}

export function formatShift(start?: string | null, end?: string | null): string {
  const s = start?.trim() || "08:00";
  const e = end?.trim() || "17:00";
  return `${s} às ${e}`;
}

export function parseEmployeeMetadata(metadata: unknown): EmployeeMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const raw = metadata as Record<string, unknown>;
  const badgeNumber =
    typeof raw.badgeNumber === "string" && raw.badgeNumber.trim()
      ? raw.badgeNumber.trim()
      : undefined;
  const uniformSize =
    typeof raw.uniformSize === "string" && raw.uniformSize.trim()
      ? raw.uniformSize.trim()
      : undefined;
  const shiftType =
    typeof raw.shiftType === "string" && raw.shiftType.trim() ? raw.shiftType.trim() : undefined;
  const notes = typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim() : undefined;

  return {
    badgeNumber,
    notes,
    shiftType,
    uniformSize
  };
}
