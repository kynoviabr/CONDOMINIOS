import Link from "next/link";
import {
  createVisitorAction,
  createVisitorUnitVisitAction,
  createVisitorVehicleAction,
  deleteVisitorAction,
  deleteVisitorVehicleAction,
  updateVisitorAction
} from "./actions";
import { requireAuthorizedProfile } from "../../../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";

type PageParams = Promise<{ condominiumId: string }>;
type SearchParams = Promise<{ q?: string; status?: string; unit?: string }>;

type Unit = {
  block: string | null;
  floor: string | null;
  id: string;
  number: string;
};

type Visitor = {
  document: string | null;
  full_name: string;
  id: string;
  notes: string | null;
  phone: string | null;
};

type VisitorVehicle = {
  id: string;
  plate: string;
  visitor_id: string;
};

type VisitHistory = {
  id: string;
  notes: string | null;
  occurred_at: string;
  unit_id: string;
  visitor_id: string;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

export default async function VisitorsPage({
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
  const unitFilter = queryParams.unit?.trim() ?? "";
  const supabase = await createServerSupabaseClient();

  const { data: condominium } = await supabase
    .from("condominiums")
    .select("id, name")
    .eq("id", condominiumId)
    .maybeSingle();

  let visitorsQuery = supabase
    .from("visitors")
    .select("id, full_name, document, phone, notes")
    .eq("condominium_id", condominiumId)
    .order("full_name", { ascending: true });

  if (safeSearchTerm) {
    visitorsQuery = visitorsQuery.or(
      `full_name.ilike.%${safeSearchTerm}%,document.ilike.%${safeSearchTerm}%,phone.ilike.%${safeSearchTerm}%`
    );
  }

  const [
    { data: visitorsData, error: visitorsError },
    { data: unitsData, error: unitsError }
  ] = await Promise.all([
    visitorsQuery,
    supabase
      .from("units")
      .select("id, block, number, floor")
      .eq("condominium_id", condominiumId)
      .order("block", { ascending: true })
      .order("number", { ascending: true })
  ]);

  const visitors = (visitorsData ?? []) as Visitor[];
  const units = (unitsData ?? []) as Unit[];
  const visitorIds = visitors.map((visitor) => visitor.id);
  const [{ data: vehiclesData }, { data: visitsData }] = visitorIds.length
    ? await Promise.all([
        supabase
          .from("visitor_vehicles")
          .select("id, visitor_id, plate")
          .in("visitor_id", visitorIds)
          .order("plate", { ascending: true }),
        supabase
          .from("visitor_unit_visits")
          .select("id, visitor_id, unit_id, occurred_at, notes")
          .in("visitor_id", visitorIds)
          .order("occurred_at", { ascending: false })
      ])
    : [{ data: [] }, { data: [] }];

  const vehicles = (vehiclesData ?? []) as VisitorVehicle[];
  const visits = ((visitsData ?? []) as VisitHistory[]).filter(
    (visit) => !unitFilter || visit.unit_id === unitFilter
  );
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const visitorsById = new Map(visitors.map((visitor) => [visitor.id, visitor]));

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Visitantes</p>
          <h1>{condominium?.name ?? "Condomínio"}</h1>
          <p className="muted">Cadastro basico de visitantes e histórico por unidade.</p>
        </div>
        <Link className="button-link secondary" href={`/dashboard/condominiums/${condominiumId}`}>
          Voltar
        </Link>
      </header>

      {queryParams.status ? <p className="form-success">Operação concluída: {queryParams.status}</p> : null}
      {visitorsError ? <p className="form-error">Falha ao carregar visitantes.</p> : null}
      {unitsError ? <p className="form-error">Falha ao carregar unidades.</p> : null}

      <section className="toolbar">
        <form className="filter-form">
          <label>
            Buscar
            <input name="q" placeholder="Nome, documento ou telefone" defaultValue={searchTerm} />
          </label>
          <label>
            Unidade do histórico
            <select name="unit" defaultValue={unitFilter}>
              <option value="">Todas</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unitLabel(unit)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href={`/dashboard/condominiums/${condominiumId}/visitors`}>
            Limpar
          </Link>
        </form>
      </section>

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Novo visitante</h2>
          <form className="admin-form" action={createVisitorAction}>
            <input name="condominiumId" type="hidden" value={condominiumId} />
            <label>
              Nome completo
              <input name="fullName" required placeholder="Joao Visitante" />
            </label>
            <label>
              Documento
              <input name="document" />
            </label>
            <label>
              Telefone
              <input name="phone" />
            </label>
            <label>
              Observações
              <textarea name="notes" rows={3} />
            </label>
            <button type="submit">Cadastrar visitante</button>
          </form>
        </div>

        <div className="admin-section">
          <h2>Registrar visita</h2>
          <form className="admin-form" action={createVisitorUnitVisitAction}>
            <input name="condominiumId" type="hidden" value={condominiumId} />
            <label>
              Visitante
              <select name="visitorId" required>
                <option value="">Selecione</option>
                {visitors.map((visitor) => (
                  <option key={visitor.id} value={visitor.id}>
                    {visitor.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unidade
              <select name="unitId" required>
                <option value="">Selecione</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unitLabel(unit)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data e hora
              <input name="occurredAt" type="datetime-local" />
            </label>
            <label>
              Observações
              <textarea name="notes" rows={3} />
            </label>
            <button type="submit">Registrar histórico</button>
          </form>
        </div>
      </section>

      <section className="admin-section">
        <h2>Visitantes cadastrados</h2>
        <div className="list-stack">
          {visitors.map((visitor) => {
            const visitorVehicles = vehicles.filter((vehicle) => vehicle.visitor_id === visitor.id);

            return (
              <article className="management-record" key={visitor.id}>
                <form className="record-grid" action={updateVisitorAction}>
                  <input name="condominiumId" type="hidden" value={condominiumId} />
                  <input name="visitorId" type="hidden" value={visitor.id} />
                  <label>
                    Nome
                    <input name="fullName" required defaultValue={visitor.full_name} />
                  </label>
                  <label>
                    Documento
                    <input name="document" defaultValue={visitor.document ?? ""} />
                  </label>
                  <label>
                    Telefone
                    <input name="phone" defaultValue={visitor.phone ?? ""} />
                  </label>
                  <label>
                    Observações
                    <textarea name="notes" rows={3} defaultValue={visitor.notes ?? ""} />
                  </label>
                  <button type="submit">Salvar visitante</button>
                </form>

                <div>
                  <h3>Placas associadas</h3>
                  <form className="inline-form compact-form" action={createVisitorVehicleAction}>
                    <input name="condominiumId" type="hidden" value={condominiumId} />
                    <input name="visitorId" type="hidden" value={visitor.id} />
                    <input name="plate" required placeholder="ABC1D23" />
                    <button type="submit">Adicionar placa</button>
                  </form>
                  <div className="chips">
                    {visitorVehicles.map((vehicle) => (
                      <form className="chip" action={deleteVisitorVehicleAction} key={vehicle.id}>
                        <input name="condominiumId" type="hidden" value={condominiumId} />
                        <input name="visitorVehicleId" type="hidden" value={vehicle.id} />
                        <span>{vehicle.plate}</span>
                        <button className="danger compact-button" type="submit">
                          Remover
                        </button>
                      </form>
                    ))}
                  </div>
                </div>

                <form action={deleteVisitorAction}>
                  <input name="condominiumId" type="hidden" value={condominiumId} />
                  <input name="visitorId" type="hidden" value={visitor.id} />
                  <button className="danger" type="submit">
                    Remover visitante
                  </button>
                </form>
              </article>
            );
          })}
        </div>
        {!visitors.length ? <p className="muted">Nenhum visitante encontrado.</p> : null}
      </section>

      <section className="admin-section">
        <h2>Historico por unidade</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Visitante</th>
                <th>Unidade</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id}>
                  <td>{formatDate(visit.occurred_at)}</td>
                  <td>{visitorsById.get(visit.visitor_id)?.full_name ?? "Visitante removido"}</td>
                  <td>{unitLabel(unitsById.get(visit.unit_id))}</td>
                  <td>{visit.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visits.length ? <p className="muted">Nenhum histórico encontrado.</p> : null}
      </section>
    </main>
  );
}
