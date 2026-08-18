import { formatUnitLabel } from "@kynovia/database";
import Link from "next/link";
import {
  createVisitorAction,
  createVisitorUnitVisitAction,
  createVisitorVehicleAction,
  deleteVisitorAction,
  deleteVisitorVehicleAction,
  updateVisitorAction
} from "./actions";
import { DeleteVisitorButton } from "./DeleteVisitorButton";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

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

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone
  }).format(new Date(value));
}

function sanitizeSearch(value: string) {
  return value.replace(/[%,]/g, "").trim();
}

function statusMessage(status?: string) {
  const labels: Record<string, string> = {
    visit_created: "Histórico de visita registrado com sucesso.",
    visitor_created: "Visitante cadastrado com sucesso.",
    visitor_deleted: "Visitante removido com sucesso.",
    visitor_updated: "Dados do visitante atualizados.",
    visitor_vehicle_created: "Placa associada ao visitante com sucesso.",
    visitor_vehicle_deleted: "Placa removida com sucesso."
  };

  return status ? labels[status] ?? null : null;
}

function errorMessage(status?: string) {
  const labels: Record<string, string> = {
    create_visit_failed: "Não foi possível registrar a visita.",
    create_visitor_failed: "Não foi possível cadastrar o visitante.",
    create_visitor_vehicle_failed: "Não foi possível associar a placa.",
    delete_visitor_failed: "Não foi possível remover o visitante.",
    delete_visitor_vehicle_failed: "Não foi possível remover a placa.",
    invalid_visitor_vehicle_plate: "Informe uma placa brasileira válida (Mercosul ou antiga).",
    missing_visit_fields: "Informe o visitante e a unidade de destino.",
    missing_visitor_fields: "Informe os dados obrigatórios do visitante.",
    missing_visitor_id: "Não foi possível identificar o visitante.",
    missing_visitor_vehicle_id: "Não foi possível identificar a placa.",
    update_visitor_failed: "Não foi possível atualizar os dados do visitante."
  };

  return status ? labels[status] ?? null : null;
}

export default async function VisitorsPage({ searchParams }: { searchParams: SearchParams }) {
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "visitors");
  const params = await searchParams;
  const search = sanitizeSearch(params.q ?? "");
  const selectedUnit = (params.unit ?? "").trim();
  const supabase = await createServerSupabaseClient();

  const [{ data: unitsData }, { data: rawVisitorsData }, { data: vehiclesData }, { data: visitsData }] =
    await Promise.all([
      supabase
        .from("units")
        .select("id, block, number, floor")
        .eq("tenant_id", context.profile.tenantId)
        .eq("condominium_id", context.condominium.id)
        .order("number", { ascending: true }),
      supabase
        .from("visitors")
        .select("id, full_name, document, phone, notes")
        .eq("tenant_id", context.profile.tenantId)
        .eq("condominium_id", context.condominium.id)
        .order("full_name", { ascending: true }),
      supabase
        .from("visitor_vehicles")
        .select("id, visitor_id, plate")
        .eq("tenant_id", context.profile.tenantId)
        .eq("condominium_id", context.condominium.id)
        .order("plate", { ascending: true }),
      supabase
        .from("visitor_unit_visits")
        .select("id, visitor_id, unit_id, occurred_at, notes")
        .eq("tenant_id", context.profile.tenantId)
        .eq("condominium_id", context.condominium.id)
        .order("occurred_at", { ascending: false })
        .limit(100)
    ]);

  const units = (unitsData ?? []) as Unit[];
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const vehicles = (vehiclesData ?? []) as VisitorVehicle[];
  const visits = (visitsData ?? []) as VisitHistory[];

  const vehiclesByVisitor = new Map<string, VisitorVehicle[]>();
  for (const vehicle of vehicles) {
    const list = vehiclesByVisitor.get(vehicle.visitor_id) ?? [];
    list.push(vehicle);
    vehiclesByVisitor.set(vehicle.visitor_id, list);
  }

  const visitsByVisitor = new Map<string, VisitHistory[]>();
  for (const visit of visits) {
    const list = visitsByVisitor.get(visit.visitor_id) ?? [];
    list.push(visit);
    visitsByVisitor.set(visit.visitor_id, list);
  }

  const visitors = ((rawVisitorsData ?? []) as Visitor[]).filter((visitor) => {
    if (selectedUnit) {
      const visitorVisits = visitsByVisitor.get(visitor.id) ?? [];
      const hasVisited = visitorVisits.some((v) => v.unit_id === selectedUnit);
      if (!hasVisited) {
        return false;
      }
    }

    if (search) {
      const matchName = visitor.full_name.toLowerCase().includes(search.toLowerCase());
      const matchDoc = (visitor.document ?? "").toLowerCase().includes(search.toLowerCase());
      const matchPhone = (visitor.phone ?? "").toLowerCase().includes(search.toLowerCase());
      const visitorPlates = (vehiclesByVisitor.get(visitor.id) ?? []).map((v) => v.plate.toLowerCase());
      const matchPlate = visitorPlates.some((p) => p.includes(search.toLowerCase()));

      return matchName || matchDoc || matchPhone || matchPlate;
    }

    return true;
  });

  const totalVisitors = (rawVisitorsData ?? []).length;
  const visitorsWithVehicles = new Set(vehicles.map((v) => v.visitor_id)).size;
  const totalVisitsCount = visits.length;

  const success = statusMessage(params.status);
  const failure = errorMessage(params.status);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Visitantes e Placas</h1>
          <p className="muted">
            Cadastro de visitantes, veículos associados e histórico de acessos às unidades do{" "}
            <strong>{context.condominium.name}</strong>.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar ao painel
        </Link>
      </header>

      {success ? (
        <section className="feedback success" role="alert">
          {success}
        </section>
      ) : null}

      {failure ? (
        <section className="feedback destructive" role="alert">
          {failure}
        </section>
      ) : null}

      <section className="condo-overview">
        <div className="metric-card">
          <span>Total de Visitantes</span>
          <strong>{totalVisitors}</strong>
        </div>
        <div className="metric-card">
          <span>Com Veículos Cadastrados</span>
          <strong>{visitorsWithVehicles}</strong>
        </div>
        <div className="metric-card">
          <span>Visitas Registradas</span>
          <strong>{totalVisitsCount}</strong>
        </div>
      </section>

      {/* Formulário de Novo Visitante no Topo */}
      <section className="admin-section" style={{ marginBottom: "24px" }}>
        <h2>Novo Visitante</h2>
        <p className="section-description">
          Cadastre um visitante frequente, familiar ou prestador eventual vinculado às unidades.
        </p>

        <form action={createVisitorAction} className="admin-form">
          <input name="condominiumId" type="hidden" value={context.condominium.id} />
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
            }}
          >
            <label>
              Nome Completo *
              <input name="fullName" placeholder="Ex: Mariana Silveira" required />
            </label>

            <label>
              CPF ou RG
              <input name="document" placeholder="000.000.000-00" />
            </label>

            <label>
              Telefone / WhatsApp
              <input name="phone" placeholder="(11) 98888-0000" />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Observações internas
              <textarea
                name="notes"
                placeholder="Detalhes adicionais, permissões especiais, parentesco..."
                rows={2}
              />
            </label>
          </div>

          <div>
            <button type="submit">Cadastrar Visitante</button>
          </div>
        </form>
      </section>

      {/* Toolbar de Filtros */}
      <section className="toolbar">
        <form className="filter-form">
          <label>
            Buscar visitante
            <input
              defaultValue={params.q ?? ""}
              name="q"
              placeholder="Nome, documento, telefone, placa..."
            />
          </label>

          <label>
            Filtrar por unidade visitada
            <select defaultValue={params.unit ?? ""} name="unit">
              <option value="">Todas as unidades</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {formatUnitLabel(unit)}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href="/dashboard/visitors">
            Limpar
          </Link>
        </form>
      </section>

      {/* Listagem de Visitantes */}
      <section className="admin-section">
        <div className="section-heading">
          <div>
            <h2>Visitantes Cadastrados ({visitors.length})</h2>
            <p className="section-description">
              Lista de pessoas autorizadas, veículos registrados e histórico de entradas por unidade.
            </p>
          </div>
        </div>

        {visitors.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum visitante encontrado</strong>
            <p>Nenhum registro corresponde aos filtros ou termos pesquisados.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Visitante</th>
                  <th>Contato & Documento</th>
                  <th>Veículos (Placas)</th>
                  <th>Histórico de Unidades</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor) => {
                  const visitorVehicles = vehiclesByVisitor.get(visitor.id) ?? [];
                  const visitorVisits = visitsByVisitor.get(visitor.id) ?? [];

                  return (
                    <tr key={visitor.id}>
                      <td>
                        <strong>{visitor.full_name}</strong>
                        {visitor.notes ? (
                          <small className="muted" style={{ display: "block", marginTop: "2px" }}>
                            {visitor.notes}
                          </small>
                        ) : null}
                      </td>

                      <td>
                        <div style={{ display: "grid", gap: "2px", fontSize: "0.85rem" }}>
                          {visitor.document ? (
                            <span>
                              📄 <strong>{visitor.document}</strong>
                            </span>
                          ) : null}
                          {visitor.phone ? <span>📞 {visitor.phone}</span> : null}
                          {!visitor.document && !visitor.phone ? (
                            <span className="muted">Sem contato registrado</span>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "grid", gap: "4px", fontSize: "0.85rem" }}>
                          {visitorVehicles.map((v) => (
                            <div key={v.id} style={{ alignItems: "center", display: "flex", gap: "6px" }}>
                              <span className="status-badge" style={{ background: "#f1f5f9", color: "#0f172a" }}>
                                🚗 {v.plate}
                              </span>
                              <DeleteVisitorButton
                                deleteAction={deleteVisitorVehicleAction}
                                entityName={v.plate}
                                idFieldName="visitorVehicleId"
                                idValue={v.id}
                                label="x"
                              />
                            </div>
                          ))}
                          {/* Adicionar Placa Rápida */}
                          <details className="record-details" style={{ marginTop: "4px" }}>
                            <summary style={{ fontSize: "0.75rem" }}>+ Placa</summary>
                            <form
                              action={createVisitorVehicleAction}
                              className="edit-visitor-form admin-form"
                              style={{ width: "260px" }}
                            >
                              <input name="condominiumId" type="hidden" value={context.condominium.id} />
                              <input name="visitorId" type="hidden" value={visitor.id} />
                              <label>
                                Nova Placa
                                <input name="plate" placeholder="ABC1D23" required />
                              </label>
                              <button style={{ marginTop: "6px", width: "100%" }} type="submit">
                                Associar Placa
                              </button>
                            </form>
                          </details>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "grid", gap: "2px", fontSize: "0.85rem" }}>
                          {visitorVisits.slice(0, 3).map((visit) => {
                            const unit = unitsById.get(visit.unit_id);
                            return (
                              <span key={visit.id}>
                                📍 <strong>{unit ? formatUnitLabel(unit) : "Unidade"}</strong>
                                <small className="muted" style={{ marginLeft: "4px" }}>
                                  ({formatDate(visit.occurred_at, context.condominium.timezone)})
                                </small>
                              </span>
                            );
                          })}
                          {visitorVisits.length === 0 ? (
                            <span className="muted">Nenhuma visita registrada</span>
                          ) : null}

                          {/* Registrar Visita Manual */}
                          <details className="record-details" style={{ marginTop: "4px" }}>
                            <summary style={{ fontSize: "0.75rem" }}>+ Visita</summary>
                            <form
                              action={createVisitorUnitVisitAction}
                              className="edit-visitor-form admin-form"
                              style={{ width: "300px" }}
                            >
                              <input name="condominiumId" type="hidden" value={context.condominium.id} />
                              <input name="visitorId" type="hidden" value={visitor.id} />
                              <label>
                                Unidade Visitada *
                                <select name="unitId" required>
                                  <option value="">Selecione a Unidade</option>
                                  {units.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {formatUnitLabel(u)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Observações
                                <input name="notes" placeholder="Ex: Entrega, familiar..." />
                              </label>
                              <button style={{ marginTop: "6px", width: "100%" }} type="submit">
                                Registrar Visita
                              </button>
                            </form>
                          </details>
                        </div>
                      </td>

                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {/* Modal Inline de Edição */}
                        <details className="record-details">
                          <summary>Editar</summary>
                          <form action={updateVisitorAction} className="edit-visitor-form admin-form">
                            <input name="condominiumId" type="hidden" value={context.condominium.id} />
                            <input name="visitorId" type="hidden" value={visitor.id} />

                            <h3 style={{ margin: "0 0 10px" }}>Editar {visitor.full_name}</h3>

                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr" }}>
                              <label>
                                Nome Completo *
                                <input defaultValue={visitor.full_name} name="fullName" required />
                              </label>

                              <label>
                                CPF ou RG
                                <input defaultValue={visitor.document ?? ""} name="document" />
                              </label>

                              <label>
                                Telefone
                                <input defaultValue={visitor.phone ?? ""} name="phone" />
                              </label>

                              <label>
                                Observações
                                <textarea defaultValue={visitor.notes ?? ""} name="notes" rows={2} />
                              </label>
                            </div>

                            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                              <button style={{ flex: 1 }} type="submit">
                                Salvar Alterações
                              </button>
                            </div>
                          </form>
                        </details>

                        <DeleteVisitorButton
                          deleteAction={deleteVisitorAction}
                          entityName={visitor.full_name}
                          idFieldName="visitorId"
                          idValue={visitor.id}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
