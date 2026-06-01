"use server";

import { normalizeNullableText, normalizePhone, parseNonNegativeInteger } from "@kynovia/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import {
  isValidCepFormat,
  isValidCnpj,
  isValidEmail,
  isValidPhoneFormat
} from "../../lib/validation/brasil";
import { brazilStates, brazilTimezones } from "./settings/form-options";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

const settingsManagerRoles = ["condominium_admin", "syndic", "manager"];
const unitManagerRoles = [...settingsManagerRoles, "resident_manager"];
const unitRegistrationModes = ["vertical", "horizontal"] as const;

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatCnpjForStorage(value: string) {
  const digits = normalizeDigits(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function unitRegistrationMode(formData: FormData) {
  const mode = formValue(formData, "unitRegistrationMode");
  return unitRegistrationModes.includes(mode as (typeof unitRegistrationModes)[number])
    ? mode
    : null;
}

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

function redirectToUnits(status: string) {
  revalidateCondoPages();
  redirect(`/dashboard/units?status=${status}`);
}

async function ensureCondominiumAccess(condominiumId: string, allowedRoles: string[]) {
  const profile = await requireAuthorizedProfile();
  requireCondoManager(profile.role, allowedRoles);

  const supabase = await createServerSupabaseClient();
  const { data: condominium } = await supabase
    .from("condominiums")
    .select("id, metadata")
    .eq("id", condominiumId)
    .eq("tenant_id", profile.tenantId)
    .maybeSingle();

  if (!condominium) {
    redirect("/dashboard?error=condominium_access_denied");
  }

  return { condominium, profile, supabase };
}

export async function updateCondominiumAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const name = formValue(formData, "name");
  const timezone = formValue(formData, "timezone") || "America/Sao_Paulo";
  const cnpjInput = formValue(formData, "cnpj");
  const postalCodeInput = formValue(formData, "postalCode");
  const phoneInput = formValue(formData, "phone");
  const whatsappInput = formValue(formData, "whatsapp");
  const email = formValue(formData, "email");
  const state = formValue(formData, "state");
  const mode = unitRegistrationMode(formData);
  const visitorParkingCapacity = parseNonNegativeInteger(
    formValue(formData, "visitorParkingCapacity")
  );

  if (
    !condominiumId ||
    !name ||
    !formValue(formData, "fullAddress") ||
    !formValue(formData, "number") ||
    !formValue(formData, "city") ||
    !mode
  ) {
    redirectToSettings("missing_condominium_fields");
  }

  if (
    !isValidCnpj(cnpjInput) ||
    !isValidCepFormat(postalCodeInput) ||
    !isValidPhoneFormat(phoneInput) ||
    !isValidPhoneFormat(whatsappInput) ||
    !isValidEmail(email) ||
    !brazilStates.includes(state as (typeof brazilStates)[number]) ||
    !brazilTimezones.includes(timezone as (typeof brazilTimezones)[number])
  ) {
    redirectToSettings("invalid_condominium_fields");
  }

  const { profile, supabase, condominium } = await ensureCondominiumAccess(
    condominiumId,
    settingsManagerRoles
  );
  const existingMetadata = asRecord(condominium.metadata);
  const existingClient = asRecord(existingMetadata.client);
  const existingAddress = asRecord(existingClient.address);
  const formattedCnpj = formatCnpjForStorage(cnpjInput);
  const normalizedPhone = normalizePhone(phoneInput);
  const normalizedWhatsapp = normalizePhone(whatsappInput);
  const normalizedPostalCode = normalizeDigits(postalCodeInput);
  const fullAddress = formValue(formData, "fullAddress");
  const addressNumber = formValue(formData, "number");
  const complement = formValue(formData, "complement");
  const city = formValue(formData, "city");
  const { error } = await supabase
    .from("condominiums")
    .update({
      metadata: {
        ...existingMetadata,
        city,
        client: {
          ...existingClient,
          address: {
            ...existingAddress,
            city,
            complement,
            line: fullAddress,
            number: addressNumber,
            postal_code: postalCodeInput,
            state
          },
          cnpj: formattedCnpj,
          email,
          phone: phoneInput,
          trade_name: name,
          whatsapp: whatsappInput
        },
        cnpj: formattedCnpj,
        complement,
        email,
        fullAddress,
        number: addressNumber,
        phone: normalizedPhone,
        postalCode: normalizedPostalCode,
        state,
        unitRegistrationConfiguredAt: new Date().toISOString(),
        unitRegistrationMode: mode,
        whatsapp: normalizedWhatsapp
      },
      name,
      timezone,
      unit_registration_mode: mode,
      visitor_parking_capacity: visitorParkingCapacity
    })
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

export async function updateUnitRegistrationModeAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const mode = unitRegistrationMode(formData);

  if (!condominiumId || !mode) {
    redirectToSettings("missing_unit_structure");
  }

  const { profile, supabase, condominium } = await ensureCondominiumAccess(
    condominiumId,
    unitManagerRoles
  );
  const existingMetadata = asRecord(condominium.metadata);
  const { error } = await supabase
    .from("condominiums")
    .update({
      metadata: {
        ...existingMetadata,
        unitRegistrationConfiguredAt: new Date().toISOString(),
        unitRegistrationMode: mode
      },
      unit_registration_mode: mode
    })
    .eq("id", condominiumId)
    .eq("tenant_id", profile.tenantId);

  if (error) {
    redirectToSettings("unit_structure_failed");
  }

  redirectToSettings("unit_structure_updated");
}

export async function createUnitAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const mode = unitRegistrationMode(formData);
  const block =
    mode === "horizontal" ? formValue(formData, "horizontalBlock") : formValue(formData, "verticalBlock");
  const number =
    mode === "horizontal" ? formValue(formData, "horizontalNumber") : formValue(formData, "verticalNumber");
  const floor = mode === "horizontal" ? "" : formValue(formData, "verticalFloor");
  const street = mode === "horizontal" ? formValue(formData, "street") : "";
  const addressNumber = mode === "horizontal" ? formValue(formData, "addressNumber") : "";

  if (!condominiumId || !number || !mode) {
    redirectToUnits("missing_unit_fields");
  }

  const { condominium, profile, supabase } = await ensureCondominiumAccess(
    condominiumId,
    unitManagerRoles
  );
  const existingMetadata = asRecord(condominium.metadata);
  const { error } = await supabase.from("units").insert({
    tenant_id: profile.tenantId,
    condominium_id: condominiumId,
    block: normalizeNullableText(block),
    metadata: {
      addressNumber,
      complement: formValue(formData, "complement"),
      registrationMode: mode,
      street
    },
    number,
    floor: normalizeNullableText(floor)
  });

  if (error) {
    redirectToUnits("create_unit_failed");
  }

  await supabase
    .from("condominiums")
    .update({
      metadata: {
        ...existingMetadata,
        unitRegistrationConfiguredAt: new Date().toISOString(),
        unitRegistrationMode: mode
      },
      unit_registration_mode: mode
    })
    .eq("id", condominiumId)
    .eq("tenant_id", profile.tenantId);

  redirectToUnits("unit_created");
}

export async function updateUnitAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const mode = unitRegistrationMode(formData);
  const unitId = formValue(formData, "unitId");
  const number = formValue(formData, "number");

  if (!condominiumId || !unitId || !number || !mode) {
    redirectToUnits("missing_unit_fields");
  }

  const { condominium, profile, supabase } = await ensureCondominiumAccess(
    condominiumId,
    unitManagerRoles
  );
  const existingMetadata = asRecord(condominium.metadata);
  const { error } = await supabase
    .from("units")
    .update({
      block: normalizeNullableText(formValue(formData, "block")),
      metadata: {
        addressNumber: formValue(formData, "addressNumber"),
        complement: formValue(formData, "complement"),
        lot: formValue(formData, "lot"),
        registrationMode: mode,
        street: formValue(formData, "street")
      },
      number,
      floor: normalizeNullableText(formValue(formData, "floor"))
    })
    .eq("id", unitId)
    .eq("condominium_id", condominiumId);

  if (error) {
    redirectToUnits("update_unit_failed");
  }

  await supabase
    .from("condominiums")
    .update({
      metadata: {
        ...existingMetadata,
        unitRegistrationConfiguredAt: new Date().toISOString(),
        unitRegistrationMode: mode
      },
      unit_registration_mode: mode
    })
    .eq("id", condominiumId)
    .eq("tenant_id", profile.tenantId);

  redirectToUnits("unit_updated");
}

export async function deleteUnitAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const unitId = formValue(formData, "unitId");

  if (!condominiumId || !unitId) {
    redirectToUnits("missing_unit_id");
  }

  const { supabase } = await ensureCondominiumAccess(condominiumId, unitManagerRoles);
  const { error } = await supabase
    .from("units")
    .delete()
    .eq("id", unitId)
    .eq("condominium_id", condominiumId);

  if (error) {
    redirectToUnits("delete_unit_failed");
  }

  redirectToUnits("unit_deleted");
}

export async function deleteSelectedUnitsAction(formData: FormData) {
  const condominiumId = formValue(formData, "condominiumId");
  const unitIds = formData
    .getAll("unitIds")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (!condominiumId || unitIds.length === 0) {
    redirectToUnits("missing_unit_id");
  }

  const { supabase } = await ensureCondominiumAccess(condominiumId, unitManagerRoles);
  const { error } = await supabase
    .from("units")
    .delete()
    .eq("condominium_id", condominiumId)
    .in("id", unitIds);

  if (error) {
    redirectToUnits("delete_unit_failed");
  }

  redirectToUnits("unit_deleted");
}
