"use server";

import {
  isAccessDecision,
  isAccessDirection,
  isOccurrenceSeverity,
  normalizeBrazilianPlate,
  normalizeNullableText,
  normalizePhone
} from "@kynovia/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { createServerSupabaseClient } from "../../lib/supabase/server";

type DashboardStatus =
  | "gate_opened"
  | "approval_requested"
  | "supplier_access_recorded"
  | "manual_allowed"
  | "manual_denied"
  | "pending_updated"
  | "occurrence_created"
  | "invalid";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function dashboardRedirect(status: DashboardStatus): never {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invites");
  redirect(`/dashboard?status=${status}`);
}

async function getOperationalCondominium() {
  const profile = await requireAuthorizedProfile();
  const supabase = await createServerSupabaseClient();
  const { data: condominium } = await supabase
    .from("condominiums")
    .select("id, tenant_id")
    .eq("tenant_id", profile.tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!condominium) {
    return null;
  }

  return { profile, condominium, supabase };
}

export async function triggerGateCommandAction(formData: FormData) {
  const context = await getOperationalCondominium();
  if (!context) {
    dashboardRedirect("invalid");
  }

  const accessPointId = formValue(formData, "accessPointId");
  const command = formValue(formData, "command") || "open";

  if (!accessPointId) {
    dashboardRedirect("invalid");
  }

  // Insert event
  const { data: event } = await context.supabase
    .from("access_events")
    .insert({
      tenant_id: context.condominium.tenant_id,
      condominium_id: context.condominium.id,
      access_point_id: accessPointId,
      direction: "entry",
      decision: "allow",
      reason: `Comando manual de ${command === "open" ? "abertura" : command} acionado pela portaria.`,
      decided_by: context.profile.id,
      metadata: {
        source: "gate_button",
        command
      }
    })
    .select("id")
    .single();

  // Insert gate command
  await context.supabase.from("gate_commands").insert({
    tenant_id: context.condominium.tenant_id,
    condominium_id: context.condominium.id,
    access_point_id: accessPointId,
    access_event_id: event ? event.id : null,
    command,
    provider: "mock",
    status: "confirmed",
    requested_by: context.profile.id,
    metadata: {
      source: "doorman_quick_trigger",
      triggered_at: new Date().toISOString()
    }
  });

  dashboardRedirect("gate_opened");
}

export async function requestResidentApprovalAction(formData: FormData) {
  const context = await getOperationalCondominium();
  if (!context) {
    dashboardRedirect("invalid");
  }

  const unitId = formValue(formData, "unitId");
  const residentId = formValue(formData, "residentId");
  const visitorName = formValue(formData, "visitorName");
  const visitorPhone = normalizeNullableText(normalizePhone(formValue(formData, "visitorPhone")));
  const plate = normalizeNullableText(normalizeBrazilianPlate(formValue(formData, "plate")));
  const notes = normalizeNullableText(formValue(formData, "notes"));

  if (!unitId || !residentId || !visitorName) {
    dashboardRedirect("invalid");
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min validity

  await context.supabase.from("resident_access_approvals").insert({
    tenant_id: context.condominium.tenant_id,
    condominium_id: context.condominium.id,
    unit_id: unitId,
    resident_id: residentId,
    visitor_name: visitorName,
    visitor_phone: visitorPhone,
    plate,
    notes,
    status: "pending",
    expires_at: expiresAt,
    requested_by: context.profile.id
  });

  dashboardRedirect("approval_requested");
}

export async function registerSupplierAccessAction(formData: FormData) {
  const context = await getOperationalCondominium();
  if (!context) {
    dashboardRedirect("invalid");
  }

  const supplierName = formValue(formData, "supplierName");
  const direction = formValue(formData, "direction") || "entry";
  const plate = normalizeNullableText(normalizeBrazilianPlate(formValue(formData, "plate")));
  const notes = normalizeNullableText(formValue(formData, "notes"));

  if (!supplierName) {
    dashboardRedirect("invalid");
  }

  await context.supabase.from("access_events").insert({
    tenant_id: context.condominium.tenant_id,
    condominium_id: context.condominium.id,
    plate,
    direction: isAccessDirection(direction) ? direction : "entry",
    decision: "allow",
    reason: `Acesso de prestador: ${supplierName}${notes ? ` (${notes})` : ""}.`,
    decided_by: context.profile.id,
    metadata: {
      source: "supplier_registry",
      supplierName
    }
  });

  dashboardRedirect("supplier_access_recorded");
}

export async function recordManualAccessAction(formData: FormData) {
  const context = await getOperationalCondominium();

  if (!context) {
    dashboardRedirect("invalid");
  }

  const decision = formValue(formData, "decision");
  const direction = formValue(formData, "direction");

  if (!isAccessDecision(decision) || decision === "manual_review" || !isAccessDirection(direction)) {
    dashboardRedirect("invalid");
  }

  const plate = normalizeNullableText(normalizeBrazilianPlate(formValue(formData, "plate")));
  const reason = normalizeNullableText(formValue(formData, "reason"));
  const accessPointId = normalizeNullableText(formValue(formData, "accessPointId"));
  const visitorName = normalizeNullableText(formValue(formData, "visitorName"));
  const unitReference = normalizeNullableText(formValue(formData, "unitReference"));

  const { data: event } = await context.supabase
    .from("access_events")
    .insert({
      tenant_id: context.condominium.tenant_id,
      condominium_id: context.condominium.id,
      access_point_id: accessPointId,
      plate,
      direction,
      decision,
      reason: reason ?? (decision === "allow" ? "Liberação manual pela portaria." : "Acesso negado pela portaria."),
      decided_by: context.profile.id,
      metadata: {
        source: "doorman_panel",
        unitReference,
        visitorName
      }
    })
    .select("id")
    .single();

  if (decision === "allow" && accessPointId && event) {
    await context.supabase.from("gate_commands").insert({
      tenant_id: context.condominium.tenant_id,
      condominium_id: context.condominium.id,
      access_point_id: accessPointId,
      access_event_id: event.id,
      command: "open",
      provider: "mock",
      status: "confirmed",
      requested_by: context.profile.id,
      metadata: {
        reason: "manual_release",
        source: "doorman_panel"
      }
    });
  }

  dashboardRedirect(decision === "allow" ? "manual_allowed" : "manual_denied");
}

export async function resolvePendingAccessAction(formData: FormData) {
  const profile = await requireAuthorizedProfile();
  const supabase = await createServerSupabaseClient();
  const eventId = formValue(formData, "eventId");
  const decision = formValue(formData, "decision");

  if (!eventId || !isAccessDecision(decision) || decision === "manual_review") {
    dashboardRedirect("invalid");
  }

  await supabase
    .from("access_events")
    .update({
      decision,
      decided_by: profile.id,
      decided_at: new Date().toISOString(),
      reason: decision === "allow" ? "Liberado após revisão manual." : "Negado após revisão manual."
    })
    .eq("id", eventId)
    .eq("decision", "manual_review");

  dashboardRedirect("pending_updated");
}

export async function createOccurrenceAction(formData: FormData) {
  const context = await getOperationalCondominium();

  if (!context) {
    dashboardRedirect("invalid");
  }

  const title = formValue(formData, "title");
  const severity = formValue(formData, "severity") || "medium";

  if (!title || !isOccurrenceSeverity(severity)) {
    dashboardRedirect("invalid");
  }

  await context.supabase.from("gatehouse_occurrences").insert({
    tenant_id: context.condominium.tenant_id,
    condominium_id: context.condominium.id,
    title,
    description: normalizeNullableText(formValue(formData, "description")),
    severity,
    status: "open",
    created_by: context.profile.id
  });

  dashboardRedirect("occurrence_created");
}
