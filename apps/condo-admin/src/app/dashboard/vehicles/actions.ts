"use server";

import {
  isLikelyBrazilianPlate,
  isResidentVehicleStatus,
  isResidentVehicleType,
  normalizeBrazilianPlate,
  normalizeNullableText
} from "@kynovia/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectToVehicles(status: string): never {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/vehicles");
  redirect(`/dashboard/vehicles?feedback=${status}`);
}

async function getAuthorizedVehicleContext() {
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "vehicles");
  const supabase = await createServerSupabaseClient();
  return { condominium: context.condominium, profile: context.profile, supabase };
}

async function validateAssociations(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  condominiumId: string,
  residentId: string,
  unitId: string
) {
  const [{ data: unit }, { data: resident }, { data: residentUnit }] = await Promise.all([
    supabase
      .from("units")
      .select("id")
      .eq("id", unitId)
      .eq("condominium_id", condominiumId)
      .maybeSingle(),
    supabase
      .from("residents")
      .select("id")
      .eq("id", residentId)
      .eq("condominium_id", condominiumId)
      .maybeSingle(),
    supabase
      .from("resident_units")
      .select("id")
      .eq("resident_id", residentId)
      .eq("unit_id", unitId)
      .eq("condominium_id", condominiumId)
      .maybeSingle()
  ]);

  if (!unit) redirectToVehicles("invalid_unit_scope");
  if (!resident) redirectToVehicles("invalid_resident_scope");
  if (!residentUnit) redirectToVehicles("invalid_resident_unit_link");
}

function vehiclePayload(formData: FormData) {
  const status = formValue(formData, "status");
  const vehicleType = formValue(formData, "vehicleType");

  return {
    plate: normalizeBrazilianPlate(formValue(formData, "plate")),
    resident_id: formValue(formData, "residentId"),
    unit_id: formValue(formData, "unitId"),
    status,
    vehicle_type: vehicleType,
    brand: normalizeNullableText(formValue(formData, "brand")),
    model: normalizeNullableText(formValue(formData, "model")),
    color: normalizeNullableText(formValue(formData, "color")),
    notes: normalizeNullableText(formValue(formData, "notes")),
    block_reason:
      status === "blocked" ? normalizeNullableText(formValue(formData, "blockReason")) : null,
    blocked_at: status === "blocked" ? new Date().toISOString() : null
  };
}

function validateVehiclePayload(payload: ReturnType<typeof vehiclePayload>) {
  if (!isLikelyBrazilianPlate(payload.plate)) redirectToVehicles("invalid_plate");
  if (!payload.resident_id || !payload.unit_id) redirectToVehicles("missing_vehicle_links");
  if (!isResidentVehicleType(payload.vehicle_type)) redirectToVehicles("invalid_vehicle_type");
  if (!isResidentVehicleStatus(payload.status)) redirectToVehicles("invalid_vehicle_status");
}

function databaseFailure(error: { code?: string } | null, fallback: string): never {
  if (error?.code === "23505") redirectToVehicles("duplicate_plate");
  if (error?.code === "23514" || error?.code === "P0001") {
    redirectToVehicles("invalid_vehicle_scope");
  }
  redirectToVehicles(fallback);
}

export async function createVehicleAction(formData: FormData) {
  const payload = vehiclePayload(formData);
  validateVehiclePayload(payload);

  const { condominium, profile, supabase } = await getAuthorizedVehicleContext();
  await validateAssociations(supabase, condominium.id, payload.resident_id, payload.unit_id);

  const { error } = await supabase.from("resident_vehicles").insert({
    ...payload,
    tenant_id: profile.tenantId,
    condominium_id: condominium.id
  });

  if (error) databaseFailure(error, "create_vehicle_failed");
  redirectToVehicles("vehicle_created");
}

export async function updateVehicleAction(formData: FormData) {
  const vehicleId = formValue(formData, "vehicleId");
  const payload = vehiclePayload(formData);

  if (!vehicleId) redirectToVehicles("missing_vehicle_id");
  validateVehiclePayload(payload);

  const { condominium, supabase } = await getAuthorizedVehicleContext();
  await validateAssociations(supabase, condominium.id, payload.resident_id, payload.unit_id);

  const { data: vehicle, error } = await supabase
    .from("resident_vehicles")
    .update(payload)
    .eq("id", vehicleId)
    .eq("condominium_id", condominium.id)
    .select("id")
    .maybeSingle();

  if (error) databaseFailure(error, "update_vehicle_failed");
  if (!vehicle) redirectToVehicles("vehicle_not_found");
  redirectToVehicles("vehicle_updated");
}
