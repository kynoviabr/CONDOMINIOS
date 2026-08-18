"use server";

import {
  isLikelyBrazilianPlate,
  normalizeBrazilianPlate,
  normalizeNullableText,
  normalizePhone
} from "@kynovia/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function requireCondoManager(role: string) {
  if (
    ![
      "condominium_admin",
      "syndic",
      "manager",
      "doorman_supervisor",
      "resident_manager"
    ].includes(role)
  ) {
    redirect("/dashboard?error=insufficient_role");
  }
}

function visitorsPath() {
  return "/dashboard/visitors";
}

function redirectToVisitors(status: string): never {
  revalidatePath("/dashboard");
  revalidatePath(visitorsPath());
  redirect(`${visitorsPath()}?status=${status}`);
}

async function ensureCondominiumAccess(condominiumId: string) {
  const profile = await requireAuthorizedProfile();
  requireCondoManager(profile.role);

  const supabase = await createServerSupabaseClient();
  const { data: condominium } = await supabase
    .from("condominiums")
    .select("id, tenant_id")
    .eq("id", condominiumId)
    .eq("tenant_id", profile.tenantId)
    .maybeSingle();

  if (!condominium) {
    redirect("/dashboard?error=condominium_access_denied");
  }

  return { condominium, profile, supabase };
}

export async function createVisitorAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const fullName = formValue(formData, "fullName");

  if (!condominiumId || !fullName) {
    redirectToVisitors("missing_visitor_fields");
  }

  const { profile, supabase } = await ensureCondominiumAccess(condominiumId);
  const { data, error } = await supabase
    .from("visitors")
    .insert({
      tenant_id: profile.tenantId,
      condominium_id: condominiumId,
      full_name: fullName,
      document: normalizeNullableText(formValue(formData, "document")),
      phone: normalizeNullableText(normalizePhone(formValue(formData, "phone"))),
      notes: normalizeNullableText(formValue(formData, "notes"))
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectToVisitors("create_visitor_failed");
  }

  redirectToVisitors("visitor_created");
}

export async function updateVisitorAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const visitorId = formValue(formData, "visitorId");
  const fullName = formValue(formData, "fullName");

  if (!condominiumId || !visitorId || !fullName) {
    redirectToVisitors("missing_visitor_fields");
  }

  const { profile, supabase } = await ensureCondominiumAccess(condominiumId);
  const { data: updatedRows, error } = await supabase
    .from("visitors")
    .update({
      full_name: fullName,
      document: normalizeNullableText(formValue(formData, "document")),
      phone: normalizeNullableText(normalizePhone(formValue(formData, "phone"))),
      notes: normalizeNullableText(formValue(formData, "notes"))
    })
    .eq("id", visitorId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominiumId)
    .select("id");

  if (error || !updatedRows || updatedRows.length !== 1) {
    redirectToVisitors("update_visitor_failed");
  }

  redirectToVisitors("visitor_updated");
}

export async function deleteVisitorAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const visitorId = formValue(formData, "visitorId");

  if (!condominiumId || !visitorId) {
    redirectToVisitors("missing_visitor_id");
  }

  const { profile, supabase } = await ensureCondominiumAccess(condominiumId);
  const { data: deletedRows, error } = await supabase
    .from("visitors")
    .delete()
    .eq("id", visitorId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominiumId)
    .select("id");

  if (error || !deletedRows || deletedRows.length !== 1) {
    redirectToVisitors("delete_visitor_failed");
  }

  redirectToVisitors("visitor_deleted");
}

export async function createVisitorVehicleAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const visitorId = formValue(formData, "visitorId");
  const plate = normalizeBrazilianPlate(formValue(formData, "plate"));

  if (!condominiumId || !visitorId || !isLikelyBrazilianPlate(plate)) {
    redirectToVisitors("invalid_visitor_vehicle_plate");
  }

  const { profile, supabase } = await ensureCondominiumAccess(condominiumId);
  const { data, error } = await supabase
    .from("visitor_vehicles")
    .insert({
      tenant_id: profile.tenantId,
      condominium_id: condominiumId,
      visitor_id: visitorId,
      plate
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectToVisitors("create_visitor_vehicle_failed");
  }

  redirectToVisitors("visitor_vehicle_created");
}

export async function deleteVisitorVehicleAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const visitorVehicleId = formValue(formData, "visitorVehicleId");

  if (!condominiumId || !visitorVehicleId) {
    redirectToVisitors("missing_visitor_vehicle_id");
  }

  const { profile, supabase } = await ensureCondominiumAccess(condominiumId);
  const { data: deletedRows, error } = await supabase
    .from("visitor_vehicles")
    .delete()
    .eq("id", visitorVehicleId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominiumId)
    .select("id");

  if (error || !deletedRows || deletedRows.length !== 1) {
    redirectToVisitors("delete_visitor_vehicle_failed");
  }

  redirectToVisitors("visitor_vehicle_deleted");
}

export async function createVisitorUnitVisitAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const visitorId = formValue(formData, "visitorId");
  const unitId = formValue(formData, "unitId");
  const occurredAt = formValue(formData, "occurredAt");

  if (!condominiumId || !visitorId || !unitId) {
    redirectToVisitors("missing_visit_fields");
  }

  const { profile, supabase } = await ensureCondominiumAccess(condominiumId);
  const { data, error } = await supabase
    .from("visitor_unit_visits")
    .insert({
      tenant_id: profile.tenantId,
      condominium_id: condominiumId,
      visitor_id: visitorId,
      unit_id: unitId,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      notes: normalizeNullableText(formValue(formData, "notes"))
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectToVisitors("create_visit_failed");
  }

  redirectToVisitors("visit_created");
}
