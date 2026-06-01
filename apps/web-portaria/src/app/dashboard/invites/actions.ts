"use server";

import { isLikelyBrazilianPlate, normalizeBrazilianPlate, parseInviteQrPayload } from "@kynovia/database";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type InviteValidationResult =
  | "allowed"
  | "cancelled"
  | "expired"
  | "invalid"
  | "not_started"
  | "usage_limit_reached"
  | "blacklisted"
  | "parking_full"
  | "active_stay_exists"
  | "exit_recorded";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function validationRedirect(result: InviteValidationResult, inviteId?: string, plate?: string): never {
  revalidatePath("/dashboard/invites");
  const params = new URLSearchParams({ result });

  if (inviteId) {
    params.set("invite", inviteId);
  }

  if (plate) {
    params.set("plate", plate);
  }

  redirect(`/dashboard/invites?${params.toString()}`);
}

async function recordInviteValidation({
  condominiumId,
  inviteId,
  profileId,
  reason,
  result,
  tenantId
}: {
  condominiumId: string;
  inviteId?: string | null;
  profileId: string;
  reason: string;
  result: InviteValidationResult;
  tenantId: string;
}) {
  const supabase = await createServerSupabaseClient();

  await supabase.from("access_invite_validations").insert({
    tenant_id: tenantId,
    condominium_id: condominiumId,
    invite_id: inviteId ?? null,
    validated_by: profileId,
    result,
    reason
  });
}

export async function validateInviteQrAction(formData: FormData) {
  const profile = await requireAuthorizedProfile();
  const parsed = parseInviteQrPayload(formValue(formData, "qrPayload"));

  if (!parsed) {
    validationRedirect("invalid");
  }

  const supabase = await createServerSupabaseClient();
  const { data: invite } = await supabase
    .from("access_invites")
    .select(
      "id, tenant_id, condominium_id, starts_at, expires_at, max_uses, use_count, status, visitor_name"
    )
    .eq("id", parsed.inviteId)
    .eq("qr_token_hash", hashInviteToken(parsed.token))
    .maybeSingle();

  if (!invite) {
    validationRedirect("invalid");
  }

  const now = Date.now();
  let result: InviteValidationResult = "allowed";
  let reason = `Convite válido para ${invite.visitor_name}.`;

  if (invite.status === "cancelled") {
    result = "cancelled";
    reason = "Convite cancelado.";
  } else if (invite.status !== "active") {
    result = "invalid";
    reason = `Convite com status ${invite.status}.`;
  } else if (new Date(invite.starts_at).getTime() > now) {
    result = "not_started";
    reason = "Convite ainda não esta vigente.";
  } else if (new Date(invite.expires_at).getTime() < now) {
    result = "expired";
    reason = "Convite expirado.";
  } else if (invite.use_count >= invite.max_uses) {
    result = "usage_limit_reached";
    reason = "Limite de usos atingido.";
  }

  if (result === "allowed") {
    const nextUseCount = invite.use_count + 1;
    const nextStatus = nextUseCount >= invite.max_uses ? "used" : "active";

    await supabase
      .from("access_invites")
      .update({ use_count: nextUseCount, status: nextStatus })
      .eq("id", invite.id)
      .eq("use_count", invite.use_count);
  }

  await supabase.from("access_invite_validations").insert({
    tenant_id: invite.tenant_id,
    condominium_id: invite.condominium_id,
    invite_id: invite.id,
    validated_by: profile.id,
    result,
    reason
  });

  validationRedirect(result, invite.id);
}

export async function validateInvitePlateAction(formData: FormData) {
  const profile = await requireAuthorizedProfile();
  const plate = normalizeBrazilianPlate(formValue(formData, "plate"));

  if (!isLikelyBrazilianPlate(plate)) {
    validationRedirect("invalid", undefined, plate);
  }

  const supabase = await createServerSupabaseClient();
  const { data: blacklist } = await supabase
    .from("vehicle_plate_blacklist")
    .select("tenant_id, condominium_id, reason")
    .eq("plate", plate)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (blacklist) {
    await recordInviteValidation({
      tenantId: blacklist.tenant_id,
      condominiumId: blacklist.condominium_id,
      profileId: profile.id,
      result: "blacklisted",
      reason: blacklist.reason ?? "Placa bloqueada."
    });
    validationRedirect("blacklisted", undefined, plate);
  }

  const { data: invite } = await supabase
    .from("access_invites")
    .select(
      "id, tenant_id, condominium_id, unit_id, starts_at, expires_at, max_uses, use_count, status, visitor_name, plate"
    )
    .eq("plate", plate)
    .eq("status", "active")
    .order("expires_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!invite) {
    validationRedirect("invalid", undefined, plate);
  }

  const now = Date.now();
  let result: InviteValidationResult = "allowed";
  let reason = `Placa autorizada para ${invite.visitor_name}.`;

  if (new Date(invite.starts_at).getTime() > now) {
    result = "not_started";
    reason = "Convite por placa ainda não esta vigente.";
  } else if (new Date(invite.expires_at).getTime() < now) {
    result = "expired";
    reason = "Convite por placa expirado.";
  } else if (invite.use_count >= invite.max_uses) {
    result = "usage_limit_reached";
    reason = "Limite de entradas por placa atingido.";
  }

  if (result === "allowed") {
    const { data: activeStay } = await supabase
      .from("visitor_vehicle_accesses")
      .select("id")
      .eq("condominium_id", invite.condominium_id)
      .eq("plate", plate)
      .eq("status", "active")
      .maybeSingle();

    if (activeStay) {
      result = "active_stay_exists";
      reason = "Esta placa ja possui permanencia ativa.";
    }
  }

  if (result === "allowed") {
    const [{ data: condominium }, { count: activeVehicleCount }] = await Promise.all([
      supabase
        .from("condominiums")
        .select("visitor_parking_capacity")
        .eq("id", invite.condominium_id)
        .maybeSingle(),
      supabase
        .from("visitor_vehicle_accesses")
        .select("id", { count: "exact", head: true })
        .eq("condominium_id", invite.condominium_id)
        .eq("status", "active")
    ]);

    if (
      condominium?.visitor_parking_capacity &&
      condominium.visitor_parking_capacity > 0 &&
      (activeVehicleCount ?? 0) >= condominium.visitor_parking_capacity
    ) {
      result = "parking_full";
      reason = "Vagas de visitantes esgotadas.";
    }
  }

  if (result === "allowed") {
    const nextUseCount = invite.use_count + 1;
    const nextStatus = nextUseCount >= invite.max_uses ? "used" : "active";

    await supabase
      .from("access_invites")
      .update({ use_count: nextUseCount, status: nextStatus })
      .eq("id", invite.id)
      .eq("use_count", invite.use_count);

    await supabase.from("visitor_vehicle_accesses").insert({
      tenant_id: invite.tenant_id,
      condominium_id: invite.condominium_id,
      invite_id: invite.id,
      unit_id: invite.unit_id,
      plate,
      visitor_name: invite.visitor_name,
      entry_validated_by: profile.id
    });
  }

  await recordInviteValidation({
    tenantId: invite.tenant_id,
    condominiumId: invite.condominium_id,
    inviteId: invite.id,
    profileId: profile.id,
    result,
    reason
  });

  validationRedirect(result, invite.id, plate);
}

export async function registerPlateExitAction(formData: FormData) {
  const profile = await requireAuthorizedProfile();
  const plate = normalizeBrazilianPlate(formValue(formData, "plate"));

  if (!isLikelyBrazilianPlate(plate)) {
    validationRedirect("invalid", undefined, plate);
  }

  const supabase = await createServerSupabaseClient();
  const { data: stay } = await supabase
    .from("visitor_vehicle_accesses")
    .select("id, tenant_id, condominium_id, invite_id")
    .eq("plate", plate)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!stay) {
    validationRedirect("invalid", undefined, plate);
  }

  await supabase
    .from("visitor_vehicle_accesses")
    .update({
      status: "exited",
      exited_at: new Date().toISOString(),
      exit_validated_by: profile.id
    })
    .eq("id", stay.id);

  await recordInviteValidation({
    tenantId: stay.tenant_id,
    condominiumId: stay.condominium_id,
    inviteId: stay.invite_id,
    profileId: profile.id,
    result: "exit_recorded",
    reason: "Saida de visitante registrada por placa."
  });

  validationRedirect("exit_recorded", stay.invite_id ?? undefined, plate);
}
