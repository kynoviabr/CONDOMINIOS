"use server";

import {
  isLikelyBrazilianPlate,
  isResidentStatus,
  isResidentUnitRelationship,
  normalizeBrazilianPlate,
  normalizeNullableText,
  normalizePhone
} from "@kynovia/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import {
  formatCpf,
  isValidBrazilianPhoneDigits,
  isValidCpf,
  isValidEmail
} from "../../../lib/validation/brasil";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function requireCondoManager(role: string) {
  if (!["condominium_admin", "syndic", "manager", "resident_manager"].includes(role)) {
    redirect("/dashboard?error=insufficient_role");
  }
}

function residentsPath() {
  return "/dashboard/residents";
}

function redirectToResidents(status: string) {
  revalidatePath("/dashboard");
  revalidatePath(residentsPath());
  redirect(`${residentsPath()}?status=${status}`);
}

function failResidents(status: string): never {
  redirectToResidents(status);
  throw new Error(status);
}

function statusFields(status: string, blockReason: string) {
  return {
    block_reason: status === "blocked" ? normalizeNullableText(blockReason) : null,
    blocked_at: status === "blocked" ? new Date().toISOString() : null,
    status
  };
}

function isValidOptionalPhone(value: string) {
  return !value || isValidBrazilianPhoneDigits(value);
}

function isValidOptionalEmail(value: string) {
  return !value || isValidEmail(value);
}

function isValidOptionalBirthDate(value: string) {
  if (!value) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function residentMetadata(formData: FormData, existingMetadata: unknown = {}) {
  return {
    ...asRecord(existingMetadata),
    birthDate: normalizeNullableText(formValue(formData, "birthDate")),
    notes: normalizeNullableText(formValue(formData, "notes")),
    photoUploadPrepared: true,
    whatsapp: normalizeNullableText(normalizePhone(formValue(formData, "whatsapp")))
  };
}

function validateResidentForm(formData: FormData) {
  const document = formValue(formData, "document");
  const phone = formValue(formData, "phone");
  const whatsapp = formValue(formData, "whatsapp");
  const email = formValue(formData, "email");
  const birthDate = formValue(formData, "birthDate");

  return (
    isValidCpf(document) &&
    isValidOptionalPhone(phone) &&
    isValidOptionalPhone(whatsapp) &&
    isValidOptionalEmail(email) &&
    isValidOptionalBirthDate(birthDate)
  );
}

async function ensureCondominiumAccess(condominiumId: string) {
  const profile = await requireAuthorizedProfile();
  requireCondoManager(profile.role);

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

async function ensureUnitBelongsToCondominium(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  condominiumId: string,
  unitId: string
) {
  const { data } = await supabase
    .from("units")
    .select("id")
    .eq("id", unitId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  return Boolean(data);
}

async function ensureResidentBelongsToCondominium(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  condominiumId: string,
  residentId: string
) {
  const { data } = await supabase
    .from("residents")
    .select("id, metadata")
    .eq("id", residentId)
    .eq("condominium_id", condominiumId)
    .maybeSingle();

  return data;
}

export async function createResidentAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const fullName = formValue(formData, "fullName");
  const status = formValue(formData, "status") || "active";
  const unitId = formValue(formData, "unitId");
  const relationship = formValue(formData, "relationship") || "resident";

  if (
    !condominiumId ||
    !fullName ||
    !unitId ||
    !isResidentStatus(status) ||
    !isResidentUnitRelationship(relationship) ||
    !validateResidentForm(formData)
  ) {
    failResidents("missing_resident_fields");
  }

  const { profile, supabase } = await ensureCondominiumAccess(condominiumId);
  const unitBelongsToCondominium = await ensureUnitBelongsToCondominium(
    supabase,
    condominiumId,
    unitId
  );

  if (!unitBelongsToCondominium) {
    failResidents("invalid_unit_scope");
  }

  const { data: resident, error } = await supabase
    .from("residents")
    .insert({
      tenant_id: profile.tenantId,
      condominium_id: condominiumId,
      full_name: fullName,
      document: formatCpf(formValue(formData, "document")),
      phone: normalizeNullableText(normalizePhone(formValue(formData, "phone"))),
      email: normalizeNullableText(formValue(formData, "email")),
      metadata: residentMetadata(formData),
      ...statusFields(status, formValue(formData, "blockReason"))
    })
    .select("id")
    .single();

  const residentId = resident?.id ?? "";
  if (error || !residentId) {
    failResidents("create_resident_failed");
  }

  const { error: linkError } = await supabase.from("resident_units").insert({
    tenant_id: profile.tenantId,
    condominium_id: condominiumId,
    resident_id: residentId,
    unit_id: unitId,
    relationship,
    is_primary: true
  });

  if (linkError) {
    failResidents("link_unit_failed");
  }

  redirectToResidents("resident_created");
}

export async function updateResidentAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const residentId = formValue(formData, "residentId");
  const fullName = formValue(formData, "fullName");
  const status = formValue(formData, "status");

  if (
    !condominiumId ||
    !residentId ||
    !fullName ||
    !isResidentStatus(status) ||
    !validateResidentForm(formData)
  ) {
    failResidents("missing_resident_fields");
  }

  const { supabase } = await ensureCondominiumAccess(condominiumId);
  const resident = await ensureResidentBelongsToCondominium(supabase, condominiumId, residentId);

  if (!resident) {
    failResidents("missing_resident_id");
  }

  const { error } = await supabase
    .from("residents")
    .update({
      full_name: fullName,
      document: formatCpf(formValue(formData, "document")),
      phone: normalizeNullableText(normalizePhone(formValue(formData, "phone"))),
      email: normalizeNullableText(formValue(formData, "email")),
      metadata: residentMetadata(formData, resident.metadata),
      ...statusFields(status, formValue(formData, "blockReason"))
    })
    .eq("id", residentId)
    .eq("condominium_id", condominiumId);

  if (error) {
    failResidents("update_resident_failed");
  }

  redirectToResidents("resident_updated");
}

export async function deleteResidentAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const residentId = formValue(formData, "residentId");

  if (!condominiumId || !residentId) {
    failResidents("missing_resident_id");
  }

  const { supabase } = await ensureCondominiumAccess(condominiumId);
  const { error } = await supabase
    .from("residents")
    .delete()
    .eq("id", residentId)
    .eq("condominium_id", condominiumId);

  if (error) {
    failResidents("delete_resident_failed");
  }

  redirectToResidents("resident_deleted");
}

export async function linkResidentUnitAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const residentId = formValue(formData, "residentId");
  const unitId = formValue(formData, "unitId");
  const relationship = formValue(formData, "relationship") || "resident";

  if (!condominiumId || !residentId || !unitId || !isResidentUnitRelationship(relationship)) {
    failResidents("missing_unit_link_fields");
  }

  const { profile, supabase } = await ensureCondominiumAccess(condominiumId);
  const [resident, unitBelongsToCondominium] = await Promise.all([
    ensureResidentBelongsToCondominium(supabase, condominiumId, residentId),
    ensureUnitBelongsToCondominium(supabase, condominiumId, unitId)
  ]);

  if (!resident || !unitBelongsToCondominium) {
    failResidents("invalid_unit_scope");
  }

  const { error } = await supabase.from("resident_units").insert({
    tenant_id: profile.tenantId,
    condominium_id: condominiumId,
    resident_id: residentId,
    unit_id: unitId,
    relationship,
    is_primary: formBoolean(formData, "isPrimary")
  });

  if (error) {
    failResidents("link_unit_failed");
  }

  redirectToResidents("unit_linked");
}

export async function unlinkResidentUnitAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const residentUnitId = formValue(formData, "residentUnitId");

  if (!condominiumId || !residentUnitId) {
    failResidents("missing_unit_link_id");
  }

  const { supabase } = await ensureCondominiumAccess(condominiumId);
  const { error } = await supabase
    .from("resident_units")
    .delete()
    .eq("id", residentUnitId)
    .eq("condominium_id", condominiumId);

  if (error) {
    failResidents("unlink_unit_failed");
  }

  redirectToResidents("unit_unlinked");
}

export async function createResidentVehicleAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const residentId = formValue(formData, "residentId");
  const plate = normalizeBrazilianPlate(formValue(formData, "plate"));

  if (!condominiumId || !residentId || !isLikelyBrazilianPlate(plate)) {
    failResidents("invalid_vehicle_plate");
  }

  const { profile, supabase } = await ensureCondominiumAccess(condominiumId);
  const resident = await ensureResidentBelongsToCondominium(supabase, condominiumId, residentId);

  if (!resident) {
    failResidents("missing_resident_id");
  }

  const { error } = await supabase.from("resident_vehicles").insert({
    tenant_id: profile.tenantId,
    condominium_id: condominiumId,
    resident_id: residentId,
    plate,
    label: normalizeNullableText(formValue(formData, "label"))
  });

  if (error) {
    failResidents("create_vehicle_failed");
  }

  redirectToResidents("vehicle_created");
}

export async function updateResidentVehicleAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const vehicleId = formValue(formData, "vehicleId");
  const plate = normalizeBrazilianPlate(formValue(formData, "plate"));
  const status = formValue(formData, "status");

  if (!condominiumId || !vehicleId || !isLikelyBrazilianPlate(plate) || !isResidentStatus(status)) {
    failResidents("invalid_vehicle_fields");
  }

  const { supabase } = await ensureCondominiumAccess(condominiumId);
  const { error } = await supabase
    .from("resident_vehicles")
    .update({
      label: normalizeNullableText(formValue(formData, "label")),
      plate,
      ...statusFields(status, formValue(formData, "blockReason"))
    })
    .eq("id", vehicleId)
    .eq("condominium_id", condominiumId);

  if (error) {
    failResidents("update_vehicle_failed");
  }

  redirectToResidents("vehicle_updated");
}

export async function deleteResidentVehicleAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const vehicleId = formValue(formData, "vehicleId");

  if (!condominiumId || !vehicleId) {
    failResidents("missing_vehicle_id");
  }

  const { supabase } = await ensureCondominiumAccess(condominiumId);
  const { error } = await supabase
    .from("resident_vehicles")
    .delete()
    .eq("id", vehicleId)
    .eq("condominium_id", condominiumId);

  if (error) {
    failResidents("delete_vehicle_failed");
  }

  redirectToResidents("vehicle_deleted");
}
