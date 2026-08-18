import { createHash } from "node:crypto";

export const inviteStatuses = ["active", "cancelled", "expired", "used"] as const;
export const inviteTypes = ["single", "recurring"] as const;
export const inviteValidationResults = [
  "allowed",
  "denied",
  "expired",
  "cancelled",
  "not_started",
  "usage_limit_reached",
  "invalid",
  "blacklisted",
  "parking_full",
  "active_stay_exists",
  "exit_recorded"
] as const;

export type InviteStatus = (typeof inviteStatuses)[number];
export type InviteType = (typeof inviteTypes)[number];
export type InviteValidationResult = (typeof inviteValidationResults)[number];

export function isInviteStatus(value: string): value is InviteStatus {
  return inviteStatuses.includes(value as InviteStatus);
}

export function isInviteType(value: string): value is InviteType {
  return inviteTypes.includes(value as InviteType);
}

export function isInviteValidationResult(value: string): value is InviteValidationResult {
  return inviteValidationResults.includes(value as InviteValidationResult);
}

export function normalizeInviteUsageLimit(value: string, fallback = 1) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildInviteQrPayload(inviteId: string, token: string) {
  return `${inviteId}.${token}`;
}

export function parseInviteQrPayload(payload: string) {
  const [inviteId, ...tokenParts] = payload.trim().split(".");
  const token = tokenParts.join(".");

  if (!inviteId || !token) {
    return null;
  }

  return { inviteId, token };
}

export function hasPlateAuthorization(plate: string | null | undefined) {
  return typeof plate === "string" && plate.trim().length > 0;
}

export function canResidentCreateInviteForUnit(params: {
  authUserId: string | null;
  condominiumId: string;
  residentCondominiumId: string;
  residentProfileId: string;
  residentStatus: string;
  residentUnitIds: string[];
  targetUnitId: string;
}): boolean {
  if (!params.authUserId || params.authUserId !== params.residentProfileId) {
    return false;
  }

  if (params.residentStatus !== "active") {
    return false;
  }

  if (params.condominiumId !== params.residentCondominiumId) {
    return false;
  }

  return params.residentUnitIds.includes(params.targetUnitId);
}
