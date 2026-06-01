import { residentStatuses } from "@kynovia/database";
import { ResidentsManagement } from "./ResidentsManagement";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{ q?: string; status?: string; unitId?: string }>;

type Resident = {
  block_reason: string | null;
  document: string | null;
  email: string | null;
  full_name: string;
  id: string;
  metadata: unknown;
  phone: string | null;
  status: string;
};

type Unit = {
  block: string | null;
  floor: string | null;
  id: string;
  number: string;
};

type ResidentUnit = {
  id: string;
  is_primary: boolean;
  relationship: string;
  resident_id: string;
  unit_id: string;
};

export const dynamic = "force-dynamic";

function residentMetadata(resident: Resident) {
  return resident.metadata && typeof resident.metadata === "object" && !Array.isArray(resident.metadata)
    ? (resident.metadata as Record<string, unknown>)
    : {};
}

function residentMetadataValue(resident: Resident, key: string) {
  const value = residentMetadata(resident)[key];
  return typeof value === "string" ? value : "";
}
function sanitizeSearch(value: string) {
  return value.replace(/[%,]/g, "").trim();
}

function statusMessage(status?: string) {
  const labels: Record<string, string> = {
    resident_created: "Morador cadastrado.",
    resident_updated: "Morador atualizado.",
    resident_deleted: "Morador removido.",
    unit_linked: "Unidade vinculada.",
    unit_unlinked: "Vínculo removido."
  };

  return status ? labels[status] ?? null : null;
}

function errorMessage(status?: string) {
  const labels: Record<string, string> = {
    create_resident_failed: "Não foi possível cadastrar o morador.",
    delete_resident_failed: "Não foi possível remover o morador.",
    invalid_unit_scope: "A unidade selecionada não pertence a este condomínio.",
    link_unit_failed: "Não foi possível vincular a unidade.",
    missing_resident_fields: "Informe os dados obrigatórios do morador.",
    missing_resident_id: "Não foi possível identificar o morador.",
    missing_unit_link_fields: "Informe unidade e relacionamento.",
    missing_unit_link_id: "Não foi possível identificar o vínculo.",
    unlink_unit_failed: "Não foi possível remover o vínculo.",
    update_resident_failed: "Não foi possível atualizar o morador."
  };

  return status ? labels[status] ?? null : null;
}

export default async function ResidentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "residents");
  const queryParams = await searchParams;

  const { condominium } = context;
  const searchTerm = queryParams.q?.trim() ?? "";
  const safeSearchTerm = sanitizeSearch(searchTerm);
  const statusFilter = queryParams.status?.trim() ?? "";
  const selectedUnitId = queryParams.unitId?.trim() ?? "";
  const supabase = await createServerSupabaseClient();

  const { data: unitsData, error: unitsError } = await supabase
    .from("units")
    .select("id, block, number, floor, metadata")
    .eq("condominium_id", condominium.id)
    .order("block", { ascending: true })
    .order("number", { ascending: true });
  const units = (unitsData ?? []) as Unit[];
  const unitIds = new Set(units.map((unit) => unit.id));
  const validSelectedUnitId = selectedUnitId && unitIds.has(selectedUnitId) ? selectedUnitId : "";
  const residentIdsByUnit = validSelectedUnitId
    ? await supabase
        .from("resident_units")
        .select("resident_id")
        .eq("condominium_id", condominium.id)
        .eq("unit_id", validSelectedUnitId)
    : { data: null, error: null };
  const filteredResidentIds =
    residentIdsByUnit.data?.map((link) => link.resident_id).filter(Boolean) ?? [];

  let residentsQuery = supabase
    .from("residents")
    .select("id, full_name, document, phone, email, status, block_reason, metadata")
    .eq("condominium_id", condominium.id)
    .order("full_name", { ascending: true });

  if (safeSearchTerm) {
    const digitSearchTerm = safeSearchTerm.replace(/\D/g, "");
    residentsQuery = residentsQuery.or(
      `full_name.ilike.%${safeSearchTerm}%,document.ilike.%${digitSearchTerm || safeSearchTerm}%,phone.ilike.%${digitSearchTerm || safeSearchTerm}%,email.ilike.%${safeSearchTerm}%`
    );
  }

  if (residentStatuses.includes(statusFilter as (typeof residentStatuses)[number])) {
    residentsQuery = residentsQuery.eq("status", statusFilter);
  }

  if (validSelectedUnitId) {
    residentsQuery = filteredResidentIds.length
      ? residentsQuery.in("id", filteredResidentIds)
      : residentsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: residentsData, error: residentsError } = await residentsQuery;
  const residents = (residentsData ?? []) as Resident[];
  const residentIds = residents.map((resident) => resident.id);
  const { data: residentUnitsData } = residentIds.length
    ? await supabase
        .from("resident_units")
        .select("id, resident_id, unit_id, relationship, is_primary")
        .eq("condominium_id", condominium.id)
        .in("resident_id", residentIds)
    : { data: [] };

  const residentUnits = (residentUnitsData ?? []) as ResidentUnit[];
  const success = statusMessage(queryParams.status);
  const failure = errorMessage(queryParams.status);
  const residentsForList = residents.map((resident) => ({
    birthDate: residentMetadataValue(resident, "birthDate"),
    blockReason: resident.block_reason,
    document: resident.document,
    email: resident.email,
    fullName: resident.full_name,
    id: resident.id,
    links: residentUnits
      .filter((link) => link.resident_id === resident.id)
      .map((link) => ({
        id: link.id,
        isPrimary: link.is_primary,
        relationship: link.relationship,
        unitId: link.unit_id
      })),
    notes: residentMetadataValue(resident, "notes"),
    phone: resident.phone,
    status: resident.status,
    whatsapp: residentMetadataValue(resident, "whatsapp")
  }));

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Moradores</h1>
          <p className="muted">
            Cadastro operacional do {condominium.name}, com moradores vinculados às unidades do
            condomínio.
          </p>
        </div>
      </header>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {residentsError ? <p className="form-error">Falha ao carregar moradores.</p> : null}
      {unitsError ? <p className="form-error">Falha ao carregar unidades.</p> : null}

      <ResidentsManagement
        condominiumId={condominium.id}
        query={searchTerm}
        residents={residentsForList}
        selectedStatus={statusFilter}
        selectedUnitId={validSelectedUnitId}
        units={units}
      />
    </main>
  );
}
