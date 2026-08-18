"use server";

import {
  isUnitType,
  normalizeUnitBlock,
  normalizeUnitFloor,
  normalizeUnitNumber,
  parseUnitMetadata
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

function redirectToUnits(status: string): never {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/units");
  revalidatePath("/dashboard/residents");
  revalidatePath("/dashboard/vehicles");
  redirect(`/dashboard/units?feedback=${status}`);
}

async function getAuthorizedUnitContext() {
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "units");
  const supabase = await createServerSupabaseClient();
  return { condominium: context.condominium, profile: context.profile, supabase };
}

function unitMetadataFromForm(formData: FormData, currentMetadata: unknown = {}) {
  const parsed = parseUnitMetadata(currentMetadata);
  const intercom = formValue(formData, "intercom");
  const parkingSpaces = formValue(formData, "parkingSpaces");
  const unitTypeRaw = formValue(formData, "unitType");
  const notes = formValue(formData, "notes");

  return {
    ...parsed,
    intercom: intercom ? intercom.slice(0, 30) : undefined,
    parkingSpaces: parkingSpaces ? parkingSpaces.slice(0, 80) : undefined,
    unitType: isUnitType(unitTypeRaw) ? unitTypeRaw : undefined,
    notes: notes ? notes.slice(0, 500) : undefined
  };
}

export async function createUnitAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedUnitContext();

  const number = normalizeUnitNumber(formValue(formData, "number"));
  const block = normalizeUnitBlock(formValue(formData, "block"));
  const floor = normalizeUnitFloor(formValue(formData, "floor"));

  if (!number) {
    redirectToUnits("missing_unit_number");
  }

  const metadata = unitMetadataFromForm(formData);

  const { data, error } = await supabase
    .from("units")
    .insert({
      tenant_id: profile.tenantId,
      condominium_id: condominium.id,
      block,
      number,
      floor,
      metadata
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      redirectToUnits("duplicate_unit");
    }
    redirectToUnits("create_unit_failed");
  }

  if (!data) {
    redirectToUnits("create_unit_failed");
  }

  redirectToUnits("unit_created");
}

export async function updateUnitAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedUnitContext();

  const unitId = formValue(formData, "unitId");
  const number = normalizeUnitNumber(formValue(formData, "number"));
  const block = normalizeUnitBlock(formValue(formData, "block"));
  const floor = normalizeUnitFloor(formValue(formData, "floor"));

  if (!unitId) {
    redirectToUnits("missing_unit_id");
  }

  if (!number) {
    redirectToUnits("missing_unit_number");
  }

  const { data: existingUnit, error: fetchError } = await supabase
    .from("units")
    .select("id, metadata")
    .eq("id", unitId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .maybeSingle();

  if (fetchError || !existingUnit) {
    redirectToUnits("unit_not_found");
  }

  const metadata = unitMetadataFromForm(formData, existingUnit.metadata);

  const { data: updatedUnits, error } = await supabase
    .from("units")
    .update({
      block,
      number,
      floor,
      metadata,
      updated_at: new Date().toISOString()
    })
    .eq("id", unitId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      redirectToUnits("duplicate_unit");
    }
    redirectToUnits("update_unit_failed");
  }

  if (!updatedUnits || updatedUnits.length !== 1) {
    redirectToUnits("unit_not_found");
  }

  redirectToUnits("unit_updated");
}

export async function deleteUnitAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedUnitContext();

  const unitId = formValue(formData, "unitId");

  if (!unitId) {
    redirectToUnits("missing_unit_id");
  }

  // Check if unit has resident_units linked
  const { count: residentsCount } = await supabase
    .from("resident_units")
    .select("id", { count: "exact", head: true })
    .eq("unit_id", unitId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id);

  if (residentsCount && residentsCount > 0) {
    redirectToUnits("unit_has_residents");
  }

  const { data: deletedUnits, error } = await supabase
    .from("units")
    .delete()
    .eq("id", unitId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .select("id");

  if (error) {
    if (error.code === "23503") {
      redirectToUnits("unit_has_residents");
    }
    redirectToUnits("delete_unit_failed");
  }

  if (!deletedUnits || deletedUnits.length !== 1) {
    redirectToUnits("unit_not_found");
  }

  redirectToUnits("unit_deleted");
}
