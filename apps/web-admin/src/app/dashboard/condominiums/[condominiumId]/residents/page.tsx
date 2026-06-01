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
import { requireAuthorizedProfile } from "../../../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";

type PageParams = Promise<{ condominiumId: string }>;
type SearchParams = Promise<{ q?: string; status?: string; message?: string }>;

type Resident = {
  block_reason: string | null;
  document: string | null;
  email: string | null;
  full_name: string;
  id: string;
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

type ResidentVehicle = {
  block_reason: string | null;
  id: string;
  label: string | null;
  plate: string;
  resident_id: string;
  status: string;
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

export default async function ResidentsPage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  await requireAuthorizedProfile();
  const { condominiumId } = await params;
  const queryParams = await searchParams;
  const searchTerm = queryParams.q?.trim() ?? "";
  const safeSearchTerm = searchTerm.replace(/[%,]/g, "");
  const statusFilter = queryParams.status?.trim() ?? "";
  const supabase = await createServerSupabaseClient();

  const { data: condominium } = await supabase
    .from("condominiums")
    .select("id, name")
    .eq("id", condominiumId)
    .maybeSingle();

  let residentsQuery = supabase
    .from("residents")
    .select("id, full_name, document, phone, email, status, block_reason")
    .eq("condominium_id", condominiumId)
    .order("full_name", { ascending: true });

  if (safeSearchTerm) {
    residentsQuery = residentsQuery.or(
      `full_name.ilike.%${safeSearchTerm}%,document.ilike.%${safeSearchTerm}%,phone.ilike.%${safeSearchTerm}%`
    );
  }

  if (residentStatuses.includes(statusFilter as (typeof residentStatuses)[number])) {
    residentsQuery = residentsQuery.eq("status", statusFilter);
  }

  const [
    { data: residentsData, error: residentsError },
    { data: unitsData, error: unitsError }
  ] = await Promise.all([
    residentsQuery,
    supabase
      .from("units")
      .select("id, block, number, floor")
      .eq("condominium_id", condominiumId)
      .order("block", { ascending: true })
      .order("number", { ascending: true })
  ]);

  const residents = (residentsData ?? []) as Resident[];
  const units = (unitsData ?? []) as Unit[];
  const residentIds = residents.map((resident) => resident.id);
  const [{ data: residentUnitsData }, { data: vehiclesData }] = residentIds.length
    ? await Promise.all([
        supabase
          .from("resident_units")
          .select("id, resident_id, unit_id, relationship, is_primary")
          .in("resident_id", residentIds),
        supabase
          .from("resident_vehicles")
          .select("id, resident_id, plate, label, status, block_reason")
          .in("resident_id", residentIds)
          .order("plate", { ascending: true })
      ])
    : [{ data: [] }, { data: [] }];

  const residentUnits = (residentUnitsData ?? []) as ResidentUnit[];
  const vehicles = (vehiclesData ?? []) as ResidentVehicle[];
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Moradores e veiculos</p>
          <h1>{condominium?.name ?? "Condomínio"}</h1>
          <p className="muted">Cadastro de moradores, vínculos com unidades, status e veiculos.</p>
        </div>
        <Link className="button-link secondary" href={`/dashboard/condominiums/${condominiumId}`}>
          Voltar
        </Link>
      </header>

      {queryParams.message ? <p className="form-success">Operação concluída: {queryParams.message}</p> : null}
      {residentsError ? <p className="form-error">Falha ao carregar moradores.</p> : null}
      {unitsError ? <p className="form-error">Falha ao carregar unidades.</p> : null}

      <section className="toolbar">
        <form className="filter-form">
          <label>
            Buscar
            <input name="q" placeholder="Nome, documento ou telefone" defaultValue={searchTerm} />
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
          <Link className="button-link secondary" href={`/dashboard/condominiums/${condominiumId}/residents`}>
            Limpar
          </Link>
        </form>
      </section>

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Novo morador</h2>
          <form className="admin-form" action={createResidentAction}>
            <input name="condominiumId" type="hidden" value={condominiumId} />
            <label>
              Nome completo
              <input name="fullName" required placeholder="Maria Silva" />
            </label>
            <label>
              Documento
              <input name="document" placeholder="CPF ou documento interno" />
            </label>
            <label>
              Telefone
              <input name="phone" placeholder="11999990000" />
            </label>
            <label>
              E-mail
              <input name="email" type="email" placeholder="morador@example.com" />
            </label>
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
          <h2>Importacao CSV futura</h2>
          <p className="muted">
            A importacao em massa sera entregue em PR futuro com template validado,
            pre-visualizacao, isolamento por condomínio e auditoria.
          </p>
          <p className="muted">Plano tecnico documentado em docs/implementation/resident-csv-import.md.</p>
        </div>
      </section>

      <section className="admin-section">
        <h2>Moradores cadastrados</h2>
        <div className="list-stack">
          {residents.map((resident) => {
            const links = residentUnits.filter((link) => link.resident_id === resident.id);
            const residentVehicles = vehicles.filter((vehicle) => vehicle.resident_id === resident.id);

            return (
              <article className="management-record" key={resident.id}>
                <form className="record-grid" action={updateResidentAction}>
                  <input name="condominiumId" type="hidden" value={condominiumId} />
                  <input name="residentId" type="hidden" value={resident.id} />
                  <label>
                    Nome
                    <input name="fullName" required defaultValue={resident.full_name} />
                  </label>
                  <label>
                    Documento
                    <input name="document" defaultValue={resident.document ?? ""} />
                  </label>
                  <label>
                    Telefone
                    <input name="phone" defaultValue={resident.phone ?? ""} />
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
                  <button type="submit">Salvar morador</button>
                </form>

                <div className="record-subgrid">
                  <div>
                    <h3>Unidades</h3>
                    <form className="inline-form compact-form" action={linkResidentUnitAction}>
                      <input name="condominiumId" type="hidden" value={condominiumId} />
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
                          <input name="condominiumId" type="hidden" value={condominiumId} />
                          <input name="residentUnitId" type="hidden" value={link.id} />
                          <span>
                            {unitLabel(unitsById.get(link.unit_id))} - {optionLabel(link.relationship)}
                            {link.is_primary ? " - principal" : ""}
                          </span>
                          <button className="danger compact-button" type="submit">
                            Remover
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3>Veiculos</h3>
                    <form className="inline-form compact-form" action={createResidentVehicleAction}>
                      <input name="condominiumId" type="hidden" value={condominiumId} />
                      <input name="residentId" type="hidden" value={resident.id} />
                      <input name="plate" required placeholder="ABC1D23" />
                      <input name="label" placeholder="Descricao" />
                      <button type="submit">Adicionar</button>
                    </form>
                    <div className="list-stack">
                      {residentVehicles.map((vehicle) => (
                        <div className="nested-row" key={vehicle.id}>
                          <form className="inline-form compact-form" action={updateResidentVehicleAction}>
                            <input name="condominiumId" type="hidden" value={condominiumId} />
                            <input name="vehicleId" type="hidden" value={vehicle.id} />
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
                            <input name="condominiumId" type="hidden" value={condominiumId} />
                            <input name="vehicleId" type="hidden" value={vehicle.id} />
                            <button className="danger" type="submit">
                              Remover
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <form action={deleteResidentAction}>
                  <input name="condominiumId" type="hidden" value={condominiumId} />
                  <input name="residentId" type="hidden" value={resident.id} />
                  <button className="danger" type="submit">
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
