import Link from "next/link";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type UnitRegistrationMode = "horizontal" | "vertical" | null;

type Unit = {
  block: string | null;
  floor: string | null;
  id: string;
  metadata: unknown;
  number: string;
};

type Resident = {
  full_name: string;
  id: string;
};

type ResidentUnit = {
  is_primary: boolean;
  resident_id: string;
  unit_id: string;
};

type ResidentVehicle = {
  id: string;
  label: string | null;
  plate: string;
  resident_id: string;
  status: string;
};

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
    return [{ label: "Unidade", value: "Sem unidade vinculada" }];
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

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Ativo",
    blocked: "Bloqueado",
    inactive: "Inativo"
  };

  return labels[status] ?? status;
}

export default async function VehiclesPage() {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "vehicles");
  const { condominium } = context;
  const configuredUnitMode = condominium.unitRegistrationMode;
  const supabase = await createServerSupabaseClient();

  const [
    { data: residentsData, error: residentsError },
    { data: unitsData, error: unitsError }
  ] = await Promise.all([
    supabase
      .from("residents")
      .select("id, full_name")
      .eq("condominium_id", condominium.id)
      .order("full_name", { ascending: true }),
    supabase
      .from("units")
      .select("id, block, number, floor, metadata")
      .eq("condominium_id", condominium.id)
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
          .select("resident_id, unit_id, is_primary")
          .in("resident_id", residentIds),
        supabase
          .from("resident_vehicles")
          .select("id, resident_id, plate, label, status")
          .in("resident_id", residentIds)
          .order("plate", { ascending: true })
      ])
    : [{ data: [] }, { data: [] }];

  const residentUnits = (residentUnitsData ?? []) as ResidentUnit[];
  const vehicles = (vehiclesData ?? []) as ResidentVehicle[];
  const residentsById = new Map(residents.map((resident) => [resident.id, resident]));
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));

  function primaryUnitForResident(residentId: string) {
    const links = residentUnits.filter((link) => link.resident_id === residentId);
    return links.find((link) => link.is_primary) ?? links[0];
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Veiculos</h1>
          <p className="muted">
            Consulta operacional dos veiculos vinculados aos moradores e suas unidades de
            referencia.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar
        </Link>
      </header>

      {residentsError ? <p className="form-error">Falha ao carregar moradores.</p> : null}
      {unitsError ? <p className="form-error">Falha ao carregar unidades.</p> : null}
      {!configuredUnitMode ? (
        <section className="onboarding-callout">
          <strong>Estrutura de unidades pendente</strong>
          <p>
            Configure o tipo de condominio em Configuracoes para exibir a selecao por bloco, andar e
            unidade ou por quadra, lote, rua e numero.
          </p>
          <Link className="button-link secondary" href="/dashboard/settings?onboarding=unit_structure">
            Configurar em Configuracoes
          </Link>
        </section>
      ) : null}

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Selecao de unidade</h2>
          <p className="field-hint">
            O cadastro de veiculos usa a unidade vinculada ao morador. A selecao abaixo segue a
            estrutura definida para o condominio.
          </p>
          <label className="structured-select-field">
            Unidade
            <select defaultValue="">
              <option value="">Selecione uma unidade para visualizar o formato</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unitLabel(unit, configuredUnitMode)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-section">
          <h2>Escopo desta tela</h2>
          <p className="muted">
            Criacao e edicao completa de veiculos ainda seguem pelo cadastro do morador. Esta tela
            consolida a tabela de veiculos e a unidade de referencia no padrao correto.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <h2>Veiculos cadastrados</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Descricao</th>
                <th>Morador</th>
                <th>Unidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => {
                const resident = residentsById.get(vehicle.resident_id);
                const unitLink = primaryUnitForResident(vehicle.resident_id);
                const unit = unitLink ? unitsById.get(unitLink.unit_id) : undefined;

                return (
                  <tr key={vehicle.id}>
                    <td>{vehicle.plate}</td>
                    <td>{vehicle.label || "-"}</td>
                    <td>{resident?.full_name ?? "Morador removido"}</td>
                    <td>
                      <UnitStructurePreview mode={configuredUnitMode} unit={unit} />
                    </td>
                    <td>{statusLabel(vehicle.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!vehicles.length ? <p className="muted">Nenhum veiculo encontrado.</p> : null}
      </section>
    </main>
  );
}
