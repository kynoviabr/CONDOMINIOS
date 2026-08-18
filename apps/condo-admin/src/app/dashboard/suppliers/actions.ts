"use server";

import {
  isSupplierCategory,
  isSupplierStatus,
  normalizeSupplierName,
  parseSupplierMetadata
} from "@kynovia/database";
import type { SupplierCategory, SupplierStatus } from "@kynovia/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseWeekdaysFromForm(formData: FormData): number[] {
  const weekdaysRaw = formData.getAll("allowedWeekdays");
  if (weekdaysRaw.length === 0) {
    return [1, 2, 3, 4, 5, 6, 7]; // Default to all days if none checked
  }
  const parsed = weekdaysRaw
    .map((v) => parseInt(String(v), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
  return parsed.length > 0 ? parsed : [1, 2, 3, 4, 5, 6, 7];
}

function redirectToSuppliers(feedback: string): never {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/suppliers");
  redirect(`/dashboard/suppliers?feedback=${feedback}`);
}

async function getAuthorizedSupplierContext() {
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "suppliers");
  const supabase = await createServerSupabaseClient();
  return { condominium: context.condominium, profile: context.profile, supabase };
}

function supplierMetadataFromForm(formData: FormData, currentMetadata: unknown = {}) {
  const parsed = parseSupplierMetadata(currentMetadata);
  const contractNumber = formValue(formData, "contractNumber");
  const notes = formValue(formData, "notes");

  return {
    ...parsed,
    contractNumber: contractNumber ? contractNumber.slice(0, 50) : undefined,
    notes: notes ? notes.slice(0, 500) : undefined
  };
}

export async function createSupplierAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedSupplierContext();

  const name = normalizeSupplierName(formValue(formData, "name"));
  const tradeName = formValue(formData, "tradeName") || null;
  const document = formValue(formData, "document") || null;
  const categoryRaw = formValue(formData, "category");
  const category: SupplierCategory = isSupplierCategory(categoryRaw) ? categoryRaw : "other";
  const contactName = formValue(formData, "contactName") || null;
  const phone = formValue(formData, "phone") || null;
  const email = formValue(formData, "email") || null;
  const allowedTimeStart = formValue(formData, "allowedTimeStart") || "08:00";
  const allowedTimeEnd = formValue(formData, "allowedTimeEnd") || "18:00";
  const allowedWeekdays = parseWeekdaysFromForm(formData);
  const metadata = supplierMetadataFromForm(formData);

  if (!name) {
    redirectToSuppliers("missing_supplier_name");
  }

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      tenant_id: profile.tenantId,
      condominium_id: condominium.id,
      name,
      trade_name: tradeName,
      document,
      category,
      contact_name: contactName,
      phone,
      email,
      status: "active",
      allowed_weekdays: allowedWeekdays,
      allowed_time_start: allowedTimeStart,
      allowed_time_end: allowedTimeEnd,
      metadata
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectToSuppliers("create_supplier_failed");
  }

  redirectToSuppliers("supplier_created");
}

export async function updateSupplierAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedSupplierContext();

  const supplierId = formValue(formData, "supplierId");
  const name = normalizeSupplierName(formValue(formData, "name"));
  const tradeName = formValue(formData, "tradeName") || null;
  const document = formValue(formData, "document") || null;
  const categoryRaw = formValue(formData, "category");
  const category: SupplierCategory = isSupplierCategory(categoryRaw) ? categoryRaw : "other";
  const contactName = formValue(formData, "contactName") || null;
  const phone = formValue(formData, "phone") || null;
  const email = formValue(formData, "email") || null;
  const statusRaw = formValue(formData, "status");
  const status: SupplierStatus = isSupplierStatus(statusRaw) ? statusRaw : "active";
  const allowedTimeStart = formValue(formData, "allowedTimeStart") || "08:00";
  const allowedTimeEnd = formValue(formData, "allowedTimeEnd") || "18:00";
  const allowedWeekdays = parseWeekdaysFromForm(formData);

  if (!supplierId) {
    redirectToSuppliers("missing_supplier_id");
  }

  if (!name) {
    redirectToSuppliers("missing_supplier_name");
  }

  const { data: existingSupplier, error: fetchError } = await supabase
    .from("suppliers")
    .select("id, metadata")
    .eq("id", supplierId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .maybeSingle();

  if (fetchError || !existingSupplier) {
    redirectToSuppliers("supplier_not_found");
  }

  const metadata = supplierMetadataFromForm(formData, existingSupplier.metadata);

  const { data: updatedRows, error } = await supabase
    .from("suppliers")
    .update({
      name,
      trade_name: tradeName,
      document,
      category,
      contact_name: contactName,
      phone,
      email,
      status,
      allowed_weekdays: allowedWeekdays,
      allowed_time_start: allowedTimeStart,
      allowed_time_end: allowedTimeEnd,
      metadata,
      updated_at: new Date().toISOString()
    })
    .eq("id", supplierId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .select("id");

  if (error || !updatedRows || updatedRows.length !== 1) {
    redirectToSuppliers("update_supplier_failed");
  }

  redirectToSuppliers("supplier_updated");
}

export async function toggleSupplierStatusAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedSupplierContext();

  const supplierId = formValue(formData, "supplierId");
  const targetStatus = formValue(formData, "targetStatus") as SupplierStatus;

  if (!supplierId) {
    redirectToSuppliers("missing_supplier_id");
  }

  if (!isSupplierStatus(targetStatus)) {
    redirectToSuppliers("invalid_status");
  }

  const isBlocking = targetStatus === "blocked";

  const { data: updatedRows, error } = await supabase
    .from("suppliers")
    .update({
      status: targetStatus,
      blocked_at: isBlocking ? new Date().toISOString() : null,
      block_reason: isBlocking ? formValue(formData, "blockReason") || "Bloqueado pelo administrador" : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", supplierId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .select("id");

  if (error || !updatedRows || updatedRows.length !== 1) {
    redirectToSuppliers("update_supplier_failed");
  }

  redirectToSuppliers(isBlocking ? "supplier_blocked" : "supplier_activated");
}

export async function deleteSupplierAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedSupplierContext();

  const supplierId = formValue(formData, "supplierId");

  if (!supplierId) {
    redirectToSuppliers("missing_supplier_id");
  }

  const { data: deletedRows, error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", supplierId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .select("id");

  if (error || !deletedRows || deletedRows.length !== 1) {
    redirectToSuppliers("delete_supplier_failed");
  }

  redirectToSuppliers("supplier_deleted");
}
