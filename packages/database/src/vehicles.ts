export const residentVehicleTypes = [
  "automobile",
  "motorcycle",
  "bicycle",
  "van",
  "truck"
] as const;

export const residentVehicleStatuses = ["active", "inactive", "blocked"] as const;

export type ResidentVehicleType = (typeof residentVehicleTypes)[number];
export type ResidentVehicleStatus = (typeof residentVehicleStatuses)[number];

export function isResidentVehicleType(value: string): value is ResidentVehicleType {
  return residentVehicleTypes.includes(value as ResidentVehicleType);
}

export function isResidentVehicleStatus(value: string): value is ResidentVehicleStatus {
  return residentVehicleStatuses.includes(value as ResidentVehicleStatus);
}

export function sanitizeVehicleSearch(value: string) {
  return value.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
