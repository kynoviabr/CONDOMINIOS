"use server";

import {
  isAccessDecision,
  isAccessDirection,
  isOccurrenceSeverity,
  normalizeBrazilianPlate,
  normalizeNullableText
} from "@kynovia/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { createServerSupabaseClient } from "../../lib/supabase/server";

type DashboardStatus = "manual_allowed" | "manual_denied" | "pending_updated" | "occurrence_created" | "invalid";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function dashboardRedirect(status: DashboardStatus): never {
  revalidatePath("/dashboard");
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
      reason: reason ?? (decision === "allow" ? "Liberacao manual pela portaria." : "Acesso negado pela portaria."),
      decided_by: context.profile.id,
      metadata: {
        source: "doorman_panel",
        visitorName,
        unitReference
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
      status: "pending",
      requested_by: context.profile.id,
      metadata: {
        source: "doorman_panel",
        reason: "manual_release"
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
      reason: decision === "allow" ? "Liberado apos revisão manual." : "Negado apos revisão manual."
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
