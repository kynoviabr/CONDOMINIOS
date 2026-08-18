"use server";

import {
  isEmployeeDepartment,
  isEmployeeStatus,
  normalizeEmployeeName,
  parseEmployeeMetadata
} from "@kynovia/database";
import type { EmployeeDepartment, EmployeeStatus } from "@kynovia/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseWorkdaysFromForm(formData: FormData): number[] {
  const workdaysRaw = formData.getAll("workdays");
  if (workdaysRaw.length === 0) {
    return [2, 3, 4, 5, 6]; // Default to Seg a Sex
  }
  const parsed = workdaysRaw
    .map((v) => parseInt(String(v), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
  return parsed.length > 0 ? parsed : [2, 3, 4, 5, 6];
}

function redirectToEmployees(feedback: string): never {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  redirect(`/dashboard/employees?feedback=${feedback}`);
}

async function getAuthorizedEmployeeContext() {
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "employees");
  const supabase = await createServerSupabaseClient();
  return { condominium: context.condominium, profile: context.profile, supabase };
}

function employeeMetadataFromForm(formData: FormData, currentMetadata: unknown = {}) {
  const parsed = parseEmployeeMetadata(currentMetadata);
  const badgeNumber = formValue(formData, "badgeNumber");
  const uniformSize = formValue(formData, "uniformSize");
  const shiftType = formValue(formData, "shiftType");
  const notes = formValue(formData, "notes");

  return {
    ...parsed,
    badgeNumber: badgeNumber ? badgeNumber.slice(0, 30) : undefined,
    notes: notes ? notes.slice(0, 500) : undefined,
    shiftType: shiftType ? shiftType.slice(0, 30) : undefined,
    uniformSize: uniformSize ? uniformSize.slice(0, 10) : undefined
  };
}

export async function createEmployeeAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedEmployeeContext();

  const fullName = normalizeEmployeeName(formValue(formData, "fullName"));
  const document = formValue(formData, "document") || null;
  const roleTitle = formValue(formData, "roleTitle") || "Colaborador";
  const departmentRaw = formValue(formData, "department");
  const department: EmployeeDepartment = isEmployeeDepartment(departmentRaw)
    ? departmentRaw
    : "general";
  const phone = formValue(formData, "phone") || null;
  const email = formValue(formData, "email") || null;
  const shiftStart = formValue(formData, "shiftStart") || "08:00";
  const shiftEnd = formValue(formData, "shiftEnd") || "17:00";
  const workdays = parseWorkdaysFromForm(formData);
  const emergencyContactName = formValue(formData, "emergencyContactName") || null;
  const emergencyContactPhone = formValue(formData, "emergencyContactPhone") || null;
  const hireDate = formValue(formData, "hireDate") || null;
  const metadata = employeeMetadataFromForm(formData);

  if (!fullName) {
    redirectToEmployees("missing_employee_name");
  }

  const { data, error } = await supabase
    .from("employees")
    .insert({
      tenant_id: profile.tenantId,
      condominium_id: condominium.id,
      full_name: fullName,
      document,
      role_title: roleTitle,
      department,
      phone,
      email,
      shift_start: shiftStart,
      shift_end: shiftEnd,
      workdays,
      status: "active",
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      hire_date: hireDate,
      metadata
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectToEmployees("create_employee_failed");
  }

  redirectToEmployees("employee_created");
}

export async function updateEmployeeAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedEmployeeContext();

  const employeeId = formValue(formData, "employeeId");
  const fullName = normalizeEmployeeName(formValue(formData, "fullName"));
  const document = formValue(formData, "document") || null;
  const roleTitle = formValue(formData, "roleTitle") || "Colaborador";
  const departmentRaw = formValue(formData, "department");
  const department: EmployeeDepartment = isEmployeeDepartment(departmentRaw)
    ? departmentRaw
    : "general";
  const phone = formValue(formData, "phone") || null;
  const email = formValue(formData, "email") || null;
  const statusRaw = formValue(formData, "status");
  const status: EmployeeStatus = isEmployeeStatus(statusRaw) ? statusRaw : "active";
  const shiftStart = formValue(formData, "shiftStart") || "08:00";
  const shiftEnd = formValue(formData, "shiftEnd") || "17:00";
  const workdays = parseWorkdaysFromForm(formData);
  const emergencyContactName = formValue(formData, "emergencyContactName") || null;
  const emergencyContactPhone = formValue(formData, "emergencyContactPhone") || null;
  const hireDate = formValue(formData, "hireDate") || null;

  if (!employeeId) {
    redirectToEmployees("missing_employee_id");
  }

  if (!fullName) {
    redirectToEmployees("missing_employee_name");
  }

  const { data: existingEmployee, error: fetchError } = await supabase
    .from("employees")
    .select("id, metadata")
    .eq("id", employeeId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .maybeSingle();

  if (fetchError || !existingEmployee) {
    redirectToEmployees("employee_not_found");
  }

  const metadata = employeeMetadataFromForm(formData, existingEmployee.metadata);

  const { data: updatedRows, error } = await supabase
    .from("employees")
    .update({
      full_name: fullName,
      document,
      role_title: roleTitle,
      department,
      phone,
      email,
      status,
      shift_start: shiftStart,
      shift_end: shiftEnd,
      workdays,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      hire_date: hireDate,
      metadata,
      updated_at: new Date().toISOString()
    })
    .eq("id", employeeId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .select("id");

  if (error || !updatedRows || updatedRows.length !== 1) {
    redirectToEmployees("update_employee_failed");
  }

  redirectToEmployees("employee_updated");
}

export async function toggleEmployeeStatusAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedEmployeeContext();

  const employeeId = formValue(formData, "employeeId");
  const targetStatus = formValue(formData, "targetStatus") as EmployeeStatus;

  if (!employeeId) {
    redirectToEmployees("missing_employee_id");
  }

  if (!isEmployeeStatus(targetStatus)) {
    redirectToEmployees("invalid_status");
  }

  const { data: updatedRows, error } = await supabase
    .from("employees")
    .update({
      status: targetStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", employeeId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .select("id");

  if (error || !updatedRows || updatedRows.length !== 1) {
    redirectToEmployees("update_employee_failed");
  }

  const feedbackCode =
    targetStatus === "vacation"
      ? "employee_vacation"
      : targetStatus === "active"
      ? "employee_activated"
      : "employee_status_changed";

  redirectToEmployees(feedbackCode);
}

export async function deleteEmployeeAction(formData: FormData) {
  const { condominium, profile, supabase } = await getAuthorizedEmployeeContext();

  const employeeId = formValue(formData, "employeeId");

  if (!employeeId) {
    redirectToEmployees("missing_employee_id");
  }

  const { data: deletedRows, error } = await supabase
    .from("employees")
    .delete()
    .eq("id", employeeId)
    .eq("tenant_id", profile.tenantId)
    .eq("condominium_id", condominium.id)
    .select("id");

  if (error || !deletedRows || deletedRows.length !== 1) {
    redirectToEmployees("delete_employee_failed");
  }

  redirectToEmployees("employee_deleted");
}
