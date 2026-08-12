import {
  isResidentVehicleStatus,
  residentVehicleStatuses,
  residentVehicleTypes,
  sanitizeVehicleSearch
} from "@kynovia/database";
import Link from "next/link";
import { createVehicleAction, updateVehicleAction } from "./actions";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{ feedback?: string; q?: string; status?: string }>;

type Unit = { block: string | null; id: string; number: string };
type Resident = { full_name: string; id: string };
type ResidentUnit = { resident_id: string; unit_id: string };
type Vehicle = {
  block_reason: string | null;
  brand: string | null;
  color: string | null;
  id: string;
  model: string | null;
  notes: string | null;
  plate: string;
  resident_id: string;
  status: string;
  unit_id: string | null;
  vehicle_type: string | null;
};

const typeLabels: Record<string, string> = {
  automobile: "Automóvel",
  bicycle: "Bicicleta",
  motorcycle: "Motocicleta",
  truck: "Caminhão",
  van: "Van"
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  blocked: "Bloqueado",
  inactive: "Inativo"
};

const feedbackMessages: Record<string, { message: string; tone: "error" | "success" }> = {
  create_vehicle_failed: { message: "Não foi possível cadastrar o veículo.", tone: "error" },
  duplicate_plate: { message: "Esta placa já está cadastrada neste condomínio.", tone: "error" },
  invalid_plate: { message: "Informe uma placa brasileira válida.", tone: "error" },
  invalid_resident_scope: { message: "O morador não pertence ao condomínio ativo.", tone: "error" },
  invalid_resident_unit_link: {
    message: "O morador selecionado não está vinculado à unidade informada.",
    tone: "error"
  },
  invalid_unit_scope: { message: "A unidade não pertence ao condomínio ativo.", tone: "error" },
  invalid_vehicle_scope: {
    message: "Os vínculos do veículo não atendem às regras do condomínio.",
    tone: "error"
  },
  invalid_vehicle_status: { message: "Selecione um status válido.", tone: "error" },
  invalid_vehicle_type: { message: "Selecione um tipo de veículo válido.", tone: "error" },
  missing_vehicle_id: { message: "Não foi possível identificar o veículo.", tone: "error" },
  missing_vehicle_links: { message: "Selecione o morador e a unidade.", tone: "error" },
  update_vehicle_failed: { message: "Não foi possível atualizar o veículo.", tone: "error" },
  vehicle_created: { message: "Veículo cadastrado com sucesso.", tone: "success" },
  vehicle_not_found: { message: "Veículo não encontrado no condomínio ativo.", tone: "error" },
  vehicle_updated: { message: "Veículo atualizado com sucesso.", tone: "success" }
};

function unitLabel(unit: Unit | undefined) {
  return unit ? [unit.block, unit.number].filter(Boolean).join(" / ") : "Unidade indisponível";
}

function vehicleDescription(vehicle: Vehicle) {
  return [vehicle.brand, vehicle.model, vehicle.color].filter(Boolean).join(" · ") || "Sem detalhes";
}

export const dynamic = "force-dynamic";

export default async function VehiclesPage({ searchParams }: { searchParams: SearchParams }) {
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "vehicles");
  const params = await searchParams;
  const search = sanitizeVehicleSearch(params.q ?? "");
  const status = isResidentVehicleStatus(params.status ?? "") ? params.status ?? "" : "";
  const feedback = feedbackMessages[params.feedback ?? ""];
  const supabase = await createServerSupabaseClient();

  const [{ data: unitsData }, { data: residentsData }, { data: residentUnitsData }] =
    await Promise.all([
      supabase
        .from("units")
        .select("id, block, number")
        .eq("condominium_id", context.condominium.id)
        .order("block")
        .order("number"),
      supabase
        .from("residents")
        .select("id, full_name")
        .eq("condominium_id", context.condominium.id)
        .order("full_name"),
      supabase
        .from("resident_units")
        .select("resident_id, unit_id")
        .eq("condominium_id", context.condominium.id)
    ]);

  let vehiclesQuery = supabase
    .from("resident_vehicles")
    .select(
      "id, plate, resident_id, unit_id, status, vehicle_type, brand, model, color, notes, block_reason"
    )
    .eq("condominium_id", context.condominium.id)
    .order("plate");

  if (search) {
    vehiclesQuery = vehiclesQuery.or(
      `plate.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%,color.ilike.%${search}%`
    );
  }
  if (status) vehiclesQuery = vehiclesQuery.eq("status", status);

  const { data: vehiclesData, error: vehiclesError } = await vehiclesQuery;
  const units = (unitsData ?? []) as Unit[];
  const residents = (residentsData ?? []) as Resident[];
  const residentUnits = (residentUnitsData ?? []) as ResidentUnit[];
  const vehicles = (vehiclesData ?? []) as Vehicle[];
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const residentsById = new Map(residents.map((resident) => [resident.id, resident]));
  const activeCount = vehicles.filter((vehicle) => vehicle.status === "active").length;
  const blockedCount = vehicles.filter((vehicle) => vehicle.status === "blocked").length;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin · Operação</p>
          <h1>Veículos</h1>
          <p className="muted">
            Cadastre e acompanhe os veículos vinculados às unidades do {context.condominium.name}.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar ao painel
        </Link>
      </header>

      {feedback ? (
        <p className={feedback.tone === "success" ? "feedback success" : "feedback destructive"} role="status">
          {feedback.message}
        </p>
      ) : null}
      {vehiclesError ? (
        <p className="feedback destructive" role="alert">
          Não foi possível carregar os veículos. Tente novamente.
        </p>
      ) : null}

      <section className="condo-overview" aria-label="Resumo de veículos">
        <div className="metric-card"><span>Encontrados</span><strong>{vehicles.length}</strong></div>
        <div className="metric-card"><span>Ativos</span><strong>{activeCount}</strong></div>
        <div className="metric-card"><span>Bloqueados</span><strong>{blockedCount}</strong></div>
      </section>

      <section className="toolbar" aria-labelledby="vehicle-filters-title">
        <h2 className="sr-only" id="vehicle-filters-title">Filtros</h2>
        <form className="filter-form vehicle-filter-form">
          <label>
            Busca rápida
            <input defaultValue={search} maxLength={80} name="q" placeholder="Placa, marca, modelo ou cor" />
          </label>
          <label>
            Status
            <select defaultValue={status} name="status">
              <option value="">Todos</option>
              {residentVehicleStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
            </select>
          </label>
          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href="/dashboard/vehicles">Limpar</Link>
        </form>
      </section>

      <section className="admin-grid vehicle-layout">
        <div className="admin-section">
          <h2>Novo veículo</h2>
          <p className="section-description">A unidade e o morador devem possuir um vínculo ativo no cadastro.</p>
          <form action={createVehicleAction} className="admin-form vehicle-form">
            <label>Placa<input autoCapitalize="characters" maxLength={8} name="plate" placeholder="ABC1D23" required /></label>
            <label>Tipo<select name="vehicleType" required><option value="">Selecione</option>{residentVehicleTypes.map((item) => <option key={item} value={item}>{typeLabels[item]}</option>)}</select></label>
            <label>Morador<select name="residentId" required><option value="">Selecione</option>{residents.map((resident) => <option key={resident.id} value={resident.id}>{resident.full_name}</option>)}</select></label>
            <label>Unidade<select name="unitId" required><option value="">Selecione</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(unit)}</option>)}</select></label>
            <label>Marca<input maxLength={80} name="brand" placeholder="Ex.: Toyota" /></label>
            <label>Modelo<input maxLength={80} name="model" placeholder="Ex.: Corolla" /></label>
            <label>Cor<input maxLength={40} name="color" placeholder="Ex.: Prata" /></label>
            <label>Status<select name="status" required>{residentVehicleStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
            <label className="full-field">Observações<textarea maxLength={500} name="notes" placeholder="Informações operacionais relevantes" rows={3} /></label>
            <button className="full-field" disabled={!residentUnits.length} type="submit">Cadastrar veículo</button>
          </form>
          {!residentUnits.length ? <p className="form-error">Cadastre um vínculo entre morador e unidade antes de adicionar veículos.</p> : null}
        </div>

        <div className="admin-section vehicle-list-section">
          <div className="section-heading"><div><h2>Veículos cadastrados</h2><p className="section-description">Abra um registro para consultar ou editar seus dados.</p></div></div>
          {vehicles.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Placa e veículo</th><th>Morador</th><th>Unidade</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td><strong className="plate-value">{vehicle.plate}</strong><small className="table-detail">{vehicleDescription(vehicle)}</small></td>
                      <td>{residentsById.get(vehicle.resident_id)?.full_name ?? "Morador indisponível"}</td>
                      <td>{unitLabel(unitsById.get(vehicle.unit_id ?? ""))}</td>
                      <td><span className={`status-badge ${vehicle.status}`}>{statusLabels[vehicle.status] ?? vehicle.status}</span></td>
                      <td>
                        <details className="record-details">
                          <summary>Editar</summary>
                          <form action={updateVehicleAction} className="admin-form vehicle-form edit-vehicle-form">
                            <input name="vehicleId" type="hidden" value={vehicle.id} />
                            <label>Placa<input maxLength={8} name="plate" defaultValue={vehicle.plate} required /></label>
                            <label>Tipo<select defaultValue={vehicle.vehicle_type ?? ""} name="vehicleType" required><option value="">Selecione</option>{residentVehicleTypes.map((item) => <option key={item} value={item}>{typeLabels[item]}</option>)}</select></label>
                            <label>Morador<select defaultValue={vehicle.resident_id} name="residentId" required>{residents.map((resident) => <option key={resident.id} value={resident.id}>{resident.full_name}</option>)}</select></label>
                            <label>Unidade<select defaultValue={vehicle.unit_id ?? ""} name="unitId" required>{units.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(unit)}</option>)}</select></label>
                            <label>Marca<input maxLength={80} name="brand" defaultValue={vehicle.brand ?? ""} /></label>
                            <label>Modelo<input maxLength={80} name="model" defaultValue={vehicle.model ?? ""} /></label>
                            <label>Cor<input maxLength={40} name="color" defaultValue={vehicle.color ?? ""} /></label>
                            <label>Status<select defaultValue={vehicle.status} name="status">{residentVehicleStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
                            <label className="full-field">Motivo do bloqueio<input maxLength={200} name="blockReason" defaultValue={vehicle.block_reason ?? ""} placeholder="Obrigatório operacionalmente quando bloqueado" /></label>
                            <label className="full-field">Observações<textarea maxLength={500} name="notes" defaultValue={vehicle.notes ?? ""} rows={3} /></label>
                            <button className="full-field" type="submit">Salvar alterações</button>
                          </form>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><strong>Nenhum veículo encontrado</strong><p>Ajuste os filtros ou use o formulário para cadastrar o primeiro veículo.</p></div>
          )}
        </div>
      </section>
    </main>
  );
}
