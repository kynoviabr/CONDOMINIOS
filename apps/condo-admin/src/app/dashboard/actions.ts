"use server";

import { parseNonNegativeInteger } from "@kynovia/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { createServerSupabaseClient } from "../../lib/supabase/server";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const settingsManagerRoles = ["condominium_admin", "syndic", "manager"];

function requireCondoManager(role: string, allowedRoles: string[]) {
  if (!allowedRoles.includes(role)) {
    redirect("/dashboard?error=insufficient_role");
  }
}

function revalidateCondoPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/units");
}

function redirectToSettings(status: string) {
  revalidateCondoPages();
  redirect(`/dashboard/settings?status=${status}`);
}

async function ensureCondominiumAccess(condominiumId: string, allowedRoles: string[]) {
  const profile = await requireAuthorizedProfile();
  requireCondoManager(profile.role, allowedRoles);

  const supabase = await createServerSupabaseClient();
  const { data: condominium } = await supabase
    .from("condominiums")
    .select("id")
    .eq("id", condominiumId)
    .eq("tenant_id", profile.tenantId)
    .maybeSingle();

  if (!condominium) {
    redirect("/dashboard?error=condominium_access_denied");
  }

  return { profile, supabase };
}

export async function updateCondominiumAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const name = formValue(formData, "name");
  const timezone = formValue(formData, "timezone") || "America/Sao_Paulo";

  if (!condominiumId || !name) {
    redirectToSettings("missing_condominium_fields");
  }

  const { profile, supabase } = await ensureCondominiumAccess(
    condominiumId,
    settingsManagerRoles
  );
  const { error } = await supabase
    .from("condominiums")
    .update({ name, timezone })
    .eq("id", condominiumId)
    .eq("tenant_id", profile.tenantId);

  if (error) {
    redirectToSettings("update_condominium_failed");
  }

  redirectToSettings("condominium_updated");
}

export async function updateOperationalSettingsAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const visitorParkingCapacity = parseNonNegativeInteger(
    formValue(formData, "visitorParkingCapacity")
  );

  if (!condominiumId) {
    redirectToSettings("missing_condominium_id");
  }

  const { profile, supabase } = await ensureCondominiumAccess(
    condominiumId,
    settingsManagerRoles
  );
  const { error } = await supabase
    .from("condominiums")
    .update({ visitor_parking_capacity: visitorParkingCapacity })
    .eq("id", condominiumId)
    .eq("tenant_id", profile.tenantId);

  if (error) {
    redirectToSettings("update_settings_failed");
  }

  redirectToSettings("settings_updated");
}
