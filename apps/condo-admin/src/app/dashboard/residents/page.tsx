import { residentStatuses, residentUnitRelationships } from "@kynovia/database";
import Link from "next/link";
import {
  createResidentAction,
  createResidentVehicleAction,
  deleteResidentAction,
  deleteResidentVehicleAction,
  linkResidentUnitAction,
  unlinkResidentUnitAction,
  updateResidentAction,
  updateResidentVehicleAction
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
  metadata: unknown;
  number: string;
};

type ResidentUnit = {
  id: string;
  is_primary: boolean;
  relationship: string;
  resident_id: string;
  unit_id: string;
};

type ResidentVehicle = {
  block_reason: string | null;
  id: string;
  label: string | null;
  plate: string;
  resident_id: string;
  status: string;
};

export const dynamic = "force-dynamic";

type UnitRegistrationMode = "horizontal" | "vertical" | null;

function unitMetadata(unit: Unit) {
  return unit.metadata && typeof unit.metadata === "object" && !Array.isArray(unit.metadata)
    ? (unit.metadata as Record<string, unknown>)
    : {};
}

function unitMetadataValue(unit: Unit, key: string) {
  const value = unitMetadata(unit)[key];
  return typeof value === "string" ? value : "";
}

function unitFields(unit: Unit | undefined, mode: UnitRegistrationMode) {
  if (!unit) {
    return [{ label: "Unidade", value: "Unidade removida" }];
  }

  if (mode === "horizontal") {
    return [
      { label: "Quadra", value: unit.block ?? "-" },
      { label: "Lote", value: unit.number || "-" },
      { label: "Rua", value: unitMetadataValue(unit, "street") || "-" },
      { label: "Numero", value: unitMetadataValue(unit, "addressNumber") || "-" }
    ];
  }

  return [
    { label: "Bloco", value: unit.block ?? "-" },
    { label: "Andar", value: unit.floor ?? "-" },
    { label: "Unidade", value: unit.number || "-" }
  ];
}

function unitLabel(unit: Unit | undefined, mode: UnitRegistrationMode) {
  return unitFields(unit, mode)
    .map((field) => `${field.label}: ${field.value}`)
    .filter(Boolean)
    .join(" / ");
}

function UnitStructurePreview({
  mode,
  unit
}: {
  mode: UnitRegistrationMode;
  unit: Unit | undefined;
}) {
  return (
    <div className="unit-structure-preview">
      {unitFields(unit, mode).map((field) => (
        <span key={field.label}>
          <strong>{field.label}</strong>
          <em>{field.value}</em>
        </span>
      ))}
    </div>
  );
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
    unit_unlinked: "Vinculo removido.",
    vehicle_created: "Veiculo cadastrado.",
    vehicle_updated: "Veiculo atualizado.",
    vehicle_deleted: "Veiculo removido."
  };

  return status ? labels[status] ?? null : null;
}

function errorMessage(status?: string) {
  const labels: Record<string, string> = {
    create_resident_failed: "Nao foi possivel cadastrar o morador.",
    create_vehicle_failed: "Nao foi possivel cadastrar o veiculo.",
    delete_resident_failed: "Nao foi possivel remover o morador.",
    delete_vehicle_failed: "Nao foi possivel remover o veiculo.",
    invalid_unit_scope: "A unidade selecionada nao pertence a este condominio.",
    invalid_vehicle_fields: "Revise placa e status do veiculo.",
    invalid_vehicle_plate: "Informe uma placa brasileira valida.",
    link_unit_failed: "Nao foi possivel vincular a unidade.",
    missing_resident_fields: "Informe os dados obrigatorios do morador.",
    missing_resident_id: "Nao foi possivel identificar o morador.",
    missing_unit_link_fields: "Informe unidade e relacionamento.",
    missing_unit_link_id: "Nao foi possivel identificar o vinculo.",
    missing_vehicle_id: "Nao foi possivel identificar o veiculo.",
    unlink_unit_failed: "Nao foi possivel remover o vinculo.",
    update_resident_failed: "Nao foi possivel atualizar o morador.",
    update_vehicle_failed: "Nao foi possivel atualizar o veiculo."
  };

  return status ? labels[status] ?? null : null;
}

export default async function ResidentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "residents");
  const queryParams = await searchParams;

  const { condominium } = context;
  const configuredUnitMode = condominium.unitRegistrationMode;

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
  const [{ data: residentUnitsData }, { data: vehiclesData }] = residentIds.length
    ? await Promise.all([
        supabase
          .from("resident_units")
          .select("id, resident_id, unit_id, relationship, is_primary")
          .eq("condominium_id", condominium.id)
          .in("resident_id", residentIds),
        supabase
          .from("resident_vehicles")
          .select("id, resident_id, plate, label, status, block_reason")
          .eq("condominium_id", condominium.id)
          .in("resident_id", residentIds)
          .order("plate", { ascending: true })
      ])
    : [{ data: [] }, { data: [] }];

  const residentUnits = (residentUnitsData ?? []) as ResidentUnit[];
  const vehicles = (vehiclesData ?? []) as ResidentVehicle[];
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
            condominio.
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
      {!configuredUnitMode ? (
        <section className="onboarding-callout">
          <strong>Estrutura de unidades pendente</strong>
          <p>
            Configure o tipo de condominio em Configuracoes para padronizar os vinculos exibidos em
            moradores e veiculos. Voce ainda pode acessar este modulo.
          </p>
          <Link className="button-link secondary" href="/dashboard/settings?onboarding=unit_structure">
            Configurar em Configuracoes
          </Link>
        </section>
      ) : null}

      <section className="toolbar">
        <form className="filter-form">
          <label>
            Buscar
            <input name="q" placeholder="Nome, CPF, telefone ou e-mail" defaultValue={searchTerm} />
          </label>
          <label>
            Unidade
            <select name="unitId" defaultValue={validSelectedUnitId}>
              <option value="">Todas as unidades</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unitLabel(unit, configuredUnitMode)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={statusFilter}>
              <option value="">Todos</option>
              {residentStatuses.map((status) => (
                <option key={status} value={status}>
                  {optionLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href="/dashboard/residents">
            Limpar
          </Link>
        </form>
      </section>

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Novo morador</h2>
          <form className="admin-form" action={createResidentAction}>
            <input name="condominiumId" type="hidden" value={condominium.id} />
            <div className="form-block">
              <strong>Unidade do morador</strong>
              <p className="field-hint">
                {configuredUnitMode === "horizontal"
                  ? "Selecione pela estrutura Quadra, Lote, Rua e Numero."
                  : "Selecione pela estrutura Bloco, Andar e Unidade."}
              </p>
              <div className="field-preview">
                {(configuredUnitMode === "horizontal"
                  ? ["Quadra", "Lote", "Rua", "Numero"]
                  : ["Bloco", "Andar", "Unidade"]
                ).map((field) => (
                  <span key={field}>{field}</span>
                ))}
              </div>
              <label className="structured-select-field">
                Unidade
                <select name="unitId" required>
                  <option value="">Selecione a unidade</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unitLabel(unit, configuredUnitMode)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Relacao com a unidade
                <select name="relationship" defaultValue="resident">
                  {residentUnitRelationships.map((relationship) => (
                    <option key={relationship} value={relationship}>
                      {optionLabel(relationship)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
              Observacoes
              <textarea name="notes" placeholder="Observacoes internas sobre o morador" />
            </label>
            <div className="form-block muted-block">
              <strong>Foto do morador</strong>
              <p className="field-hint">
                Upload real sera conectado ao Supabase Storage em PR futuro. Por enquanto, a tela
                deixa claro que a foto ainda nao sera enviada.
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
            Esta area permite administrar moradores e vinculos com unidades do condominio ativo.
            Veiculos, importacao CSV e aprovacoes avancadas seguem em modulos ou PRs proprios.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <h2>Moradores cadastrados</h2>
        <div className="list-stack">
          {residents.map((resident) => {
            const links = residentUnits.filter((link) => link.resident_id === resident.id);
            const residentVehicles = vehicles.filter((vehicle) => vehicle.resident_id === resident.id);
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
                    Observacoes
                    <textarea name="notes" defaultValue={notes} />
                  </label>
                  <button type="submit">Salvar morador</button>
                </form>

                <div className="record-subgrid">
                  <div>
                    <h3>Unidades</h3>
                    <p className="field-hint">
                      Selecao estruturada por{" "}
                      {configuredUnitMode === "horizontal"
                        ? "quadra, lote, rua e numero"
                        : "bloco, andar e unidade"}
                      .
                    </p>
                    <form className="inline-form compact-form" action={linkResidentUnitAction}>
                      <input name="condominiumId" type="hidden" value={condominium.id} />
                      <input name="residentId" type="hidden" value={resident.id} />
                      <label className="structured-select-field">
                        Unidade
                        <select name="unitId" required>
                          <option value="">Selecione a unidade</option>
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unitLabel(unit, configuredUnitMode)}
                            </option>
                          ))}
                        </select>
                      </label>
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
                          <span className="unit-chip-content">
                            <UnitStructurePreview
                              mode={configuredUnitMode}
                              unit={unitsById.get(link.unit_id)}
                            />
                            <small>
                              {optionLabel(link.relationship)}
                              {link.is_primary ? " - principal" : ""}
                            </small>
                          </span>
                          <button className="secondary compact-button" type="submit">
                            Remover
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3>Veiculos</h3>
                    <p className="field-hint">
                      A unidade de referencia do veiculo segue o mesmo padrao selecionado para o
                      condominio.
                    </p>
                    <form className="inline-form compact-form" action={createResidentVehicleAction}>
                      <input name="condominiumId" type="hidden" value={condominium.id} />
                      <input name="residentId" type="hidden" value={resident.id} />
                      <label className="structured-select-field">
                        Unidade de referencia
                        <select disabled defaultValue={links[0]?.unit_id ?? ""}>
                          <option value="">Vincule uma unidade ao morador</option>
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unitLabel(unit, configuredUnitMode)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {links[0] ? (
                        <UnitStructurePreview
                          mode={configuredUnitMode}
                          unit={unitsById.get(links[0].unit_id)}
                        />
                      ) : null}
                      <input name="plate" required placeholder="ABC1D23" />
                      <input name="label" placeholder="Descricao" />
                      <button type="submit">Adicionar</button>
                    </form>
                    <div className="list-stack compact-stack">
                      {residentVehicles.map((vehicle) => (
                        <div className="nested-row" key={vehicle.id}>
                          <form className="inline-form compact-form" action={updateResidentVehicleAction}>
                            <input name="condominiumId" type="hidden" value={condominium.id} />
                            <input name="vehicleId" type="hidden" value={vehicle.id} />
                            {links[0] ? (
                              <UnitStructurePreview
                                mode={configuredUnitMode}
                                unit={unitsById.get(links[0].unit_id)}
                              />
                            ) : null}
                            <input name="plate" required defaultValue={vehicle.plate} />
                            <input name="label" defaultValue={vehicle.label ?? ""} />
                            <select name="status" defaultValue={vehicle.status}>
                              {residentStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {optionLabel(status)}
                                </option>
                              ))}
                            </select>
                            <input name="blockReason" defaultValue={vehicle.block_reason ?? ""} />
                            <button type="submit">Salvar</button>
                          </form>
                          <form action={deleteResidentVehicleAction}>
                            <input name="condominiumId" type="hidden" value={condominium.id} />
                            <input name="vehicleId" type="hidden" value={vehicle.id} />
                            <button className="secondary" type="submit">
                              Remover
                            </button>
                          </form>
                        </div>
                      ))}
                      {residentVehicles.length === 0 ? (
                        <p className="field-hint">
                          Nenhum veiculo vinculado. Foto preparada: upload real depende de Supabase
                          Storage em PR futuro.
                        </p>
                      ) : null}
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
