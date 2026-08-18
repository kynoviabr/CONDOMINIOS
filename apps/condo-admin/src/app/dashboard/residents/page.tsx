import { residentStatuses, residentUnitRelationships } from "@kynovia/database";
import Link from "next/link";
import {
  createResidentAction,
  deleteResidentAction,
  linkResidentUnitAction,
  unlinkResidentUnitAction,
  updateResidentAction
} from "./actions";
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

function unitLabel(unit: Unit | undefined) {
  if (!unit) {
    return "Unidade removida";
  }

  return [unit.block, unit.number, unit.floor ? `${unit.floor} andar` : null]
    .filter(Boolean)
    .join(" / ");
}

function residentMetadata(resident: Resident) {
  return resident.metadata && typeof resident.metadata === "object" && !Array.isArray(resident.metadata)
    ? (resident.metadata as Record<string, unknown>)
    : {};
}

function residentMetadataValue(resident: Resident, key: string) {
  const value = residentMetadata(resident)[key];
  return typeof value === "string" ? value : "";
}
function optionLabel(value: string) {
  const labels: Record<string, string> = {
    active: "Ativo",
    blocked: "Bloqueado",
    dependent: "Dependente",
    inactive: "Inativo",
    owner: "Proprietario",
    resident: "Morador",
    tenant: "Inquilino"
  };

  return labels[value] ?? value;
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
    unit_unlinked: "Vinculo removido."
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
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const success = statusMessage(queryParams.status);
  const failure = errorMessage(queryParams.status);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Moradores</h1>
          <p className="muted">
            Cadastro operacional do {condominium.name}, com moradores vinculados as unidades do
            condomínio.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar
        </Link>
      </header>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {residentsError ? <p className="form-error">Falha ao carregar moradores.</p> : null}
      {unitsError ? <p className="form-error">Falha ao carregar unidades.</p> : null}

      <section className="toolbar" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", margin: "0 0 24px", padding: "16px" }}>
        <form
          action="/dashboard/residents"
          method="GET"
          style={{
            alignItems: "flex-end",
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            gap: "12px",
            width: "100%"
          }}
        >
          <div style={{ display: "flex", flex: "3 1 200px", flexDirection: "column", gap: "6px", minWidth: "160px" }}>
            <span style={{ color: "#475569", fontSize: "0.82rem", fontWeight: 500 }}>Buscar</span>
            <input
              defaultValue={searchTerm}
              name="q"
              placeholder="Nome, CPF, telefone ou e-mail"
              style={{ border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem", height: "38px", minHeight: "38px", padding: "0 12px", width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", flex: "1.5 1 150px", flexDirection: "column", gap: "6px", maxWidth: "220px", minWidth: "130px" }}>
            <span style={{ color: "#475569", fontSize: "0.82rem", fontWeight: 500 }}>Unidade</span>
            <select
              defaultValue={validSelectedUnitId}
              name="unitId"
              style={{ border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem", height: "38px", minHeight: "38px", padding: "0 10px", width: "100%" }}
            >
              <option value="">Todas as unidades</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unitLabel(unit)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flex: "1 1 120px", flexDirection: "column", gap: "6px", maxWidth: "160px", minWidth: "110px" }}>
            <span style={{ color: "#475569", fontSize: "0.82rem", fontWeight: 500 }}>Status</span>
            <select
              defaultValue={statusFilter}
              name="status"
              style={{ border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem", height: "38px", minHeight: "38px", padding: "0 10px", width: "100%" }}
            >
              <option value="">Todos</option>
              {residentStatuses.map((status) => (
                <option key={status} value={status}>
                  {optionLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <button
            style={{
              alignItems: "center",
              background: "#6366f1",
              border: "none",
              borderRadius: "6px",
              color: "#ffffff",
              cursor: "pointer",
              display: "inline-flex",
              flex: "0 0 auto",
              fontSize: "0.88rem",
              fontWeight: 500,
              height: "38px",
              justifyContent: "center",
              margin: 0,
              minHeight: "38px",
              padding: "0 18px",
              whiteSpace: "nowrap",
              width: "auto"
            }}
            type="submit"
          >
            Filtrar
          </button>

          <Link
            href="/dashboard/residents"
            style={{
              alignItems: "center",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              color: "#334155",
              display: "inline-flex",
              flex: "0 0 auto",
              fontSize: "0.88rem",
              fontWeight: 500,
              height: "38px",
              justifyContent: "center",
              margin: 0,
              minHeight: "38px",
              padding: "0 16px",
              textDecoration: "none",
              whiteSpace: "nowrap",
              width: "auto"
            }}
          >
            Limpar
          </Link>
        </form>
      </section>

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Novo morador</h2>
          <form className="admin-form" action={createResidentAction}>
            <input name="condominiumId" type="hidden" value={condominium.id} />
            <label>
              Nome completo
              <input name="fullName" required placeholder="Maria Silva" />
            </label>
            <label>
              CPF
              <input name="document" required placeholder="000.000.000-00" />
            </label>
            <label>
              Data de nascimento
              <input name="birthDate" type="date" />
            </label>
            <label>
              Telefone
              <input name="phone" placeholder="(11) 99999-0000" />
            </label>
            <label>
              WhatsApp
              <input name="whatsapp" placeholder="(11) 99999-0000" />
            </label>
            <label>
              E-mail
              <input name="email" type="email" placeholder="morador@example.com" />
            </label>
            <label>
              Observações
              <textarea name="notes" placeholder="Observações internas sobre o morador" />
            </label>
            <div className="form-block muted-block">
              <strong>Foto do morador</strong>
              <p className="field-hint">
                Upload real sera conectado ao Supabase Storage em PR futuro. Por enquanto, a tela
                deixa claro que a foto ainda não sera enviada.
              </p>
              <input disabled type="file" accept="image/*" />
            </div>
            <label>
              Status
              <select name="status" defaultValue="active">
                {residentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {optionLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Motivo do bloqueio
              <input name="blockReason" placeholder="Obrigatorio apenas se bloqueado" />
            </label>
            <button type="submit">Cadastrar morador</button>
          </form>
        </div>

        <div className="admin-section">
          <h2>Escopo desta tela</h2>
          <p className="muted">
            Esta área permite administrar moradores e vínculos com unidades do condomínio ativo.
            Veiculos, importacao CSV e aprovações avançadas seguem em módulos ou PRs próprios.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <h2>Moradores cadastrados</h2>
        <div className="list-stack">
          {residents.map((resident) => {
            const links = residentUnits.filter((link) => link.resident_id === resident.id);
            const birthDate = residentMetadataValue(resident, "birthDate");
            const notes = residentMetadataValue(resident, "notes");
            const whatsapp = residentMetadataValue(resident, "whatsapp");

            return (
              <article className="management-record" key={resident.id}>
                <form className="record-grid" action={updateResidentAction}>
                  <input name="condominiumId" type="hidden" value={condominium.id} />
                  <input name="residentId" type="hidden" value={resident.id} />
                  <label>
                    Nome
                    <input name="fullName" required defaultValue={resident.full_name} />
                  </label>
                  <label>
                    CPF
                    <input name="document" required defaultValue={resident.document ?? ""} />
                  </label>
                  <label>
                    Data de nascimento
                    <input name="birthDate" type="date" defaultValue={birthDate} />
                  </label>
                  <label>
                    Telefone
                    <input name="phone" defaultValue={resident.phone ?? ""} />
                  </label>
                  <label>
                    WhatsApp
                    <input name="whatsapp" defaultValue={whatsapp} />
                  </label>
                  <label>
                    E-mail
                    <input name="email" type="email" defaultValue={resident.email ?? ""} />
                  </label>
                  <label>
                    Status
                    <select name="status" defaultValue={resident.status}>
                      {residentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {optionLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Motivo bloqueio
                    <input name="blockReason" defaultValue={resident.block_reason ?? ""} />
                  </label>
                  <label>
                    Observações
                    <textarea name="notes" defaultValue={notes} />
                  </label>
                  <button type="submit">Salvar morador</button>
                </form>

                <div className="record-subgrid">
                  <div>
                    <h3>Unidades</h3>
                    <form className="inline-form compact-form" action={linkResidentUnitAction}>
                      <input name="condominiumId" type="hidden" value={condominium.id} />
                      <input name="residentId" type="hidden" value={resident.id} />
                      <select name="unitId" required>
                        <option value="">Unidade</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unitLabel(unit)}
                          </option>
                        ))}
                      </select>
                      <select name="relationship" defaultValue="resident">
                        {residentUnitRelationships.map((relationship) => (
                          <option key={relationship} value={relationship}>
                            {optionLabel(relationship)}
                          </option>
                        ))}
                      </select>
                      <label className="checkbox-label">
                        <input name="isPrimary" type="checkbox" />
                        Principal
                      </label>
                      <button type="submit">Vincular</button>
                    </form>
                    <div className="chips">
                      {links.map((link) => (
                        <form className="chip" action={unlinkResidentUnitAction} key={link.id}>
                          <input name="condominiumId" type="hidden" value={condominium.id} />
                          <input name="residentUnitId" type="hidden" value={link.id} />
                          <span>
                            {unitLabel(unitsById.get(link.unit_id))} - {optionLabel(link.relationship)}
                            {link.is_primary ? " - principal" : ""}
                          </span>
                          <button className="secondary compact-button" type="submit">
                            Remover
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3>Resumo do morador</h3>
                    <div className="empty-state">
                      <p>
                        Historico de acessos e ocorrências sera exibido aqui quando houver eventos
                        operacionais vinculados ao morador.
                      </p>
                      <p className="field-hint">
                        Foto preparada: upload real depende de Supabase Storage em PR futuro.
                      </p>
                    </div>
                  </div>
                </div>

                <form action={deleteResidentAction}>
                  <input name="condominiumId" type="hidden" value={condominium.id} />
                  <input name="residentId" type="hidden" value={resident.id} />
                  <button className="secondary" type="submit">
                    Remover morador
                  </button>
                </form>
              </article>
            );
          })}
        </div>
        {!residents.length ? <p className="muted">Nenhum morador encontrado.</p> : null}
      </section>
    </main>
  );
}
