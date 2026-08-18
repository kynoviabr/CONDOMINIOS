import {
  formatUnitLabel,
  parseUnitMetadata,
  sanitizeUnitSearch,
  unitTypes
} from "@kynovia/database";
import type { UnitType } from "@kynovia/database";
import Link from "next/link";
import { createUnitAction, deleteUnitAction, updateUnitAction } from "./actions";
import { DeleteUnitButton } from "./DeleteUnitButton";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{
  block?: string;
  feedback?: string;
  occupancy?: string;
  q?: string;
  status?: string;
}>;

type Unit = {
  block: string | null;
  created_at: string;
  floor: string | null;
  id: string;
  metadata: unknown;
  number: string;
};

type Resident = {
  full_name: string;
  id: string;
  status: string;
};

type ResidentUnit = {
  id: string;
  is_primary: boolean;
  relationship: string;
  resident_id: string;
  unit_id: string;
};

export const dynamic = "force-dynamic";

const unitTypeLabels: Record<UnitType, string> = {
  apartment: "Apartamento",
  commercial: "Comercial / Sala",
  house: "Casa",
  other: "Outro"
};

const relationshipLabels: Record<string, string> = {
  dependent: "Dependente",
  owner: "Proprietário",
  resident: "Morador",
  tenant: "Inquilino"
};

const feedbackMessages: Record<string, { message: string; tone: "error" | "success" }> = {
  create_unit_failed: { message: "Não foi possível criar a unidade.", tone: "error" },
  delete_unit_failed: { message: "Não foi possível remover a unidade.", tone: "error" },
  duplicate_unit: {
    message: "Já existe uma unidade cadastrada com este bloco/quadra e número no condomínio.",
    tone: "error"
  },
  missing_unit_fields: { message: "Informe ao menos o número da unidade.", tone: "error" },
  missing_unit_id: { message: "Não foi possível identificar a unidade selecionada.", tone: "error" },
  missing_unit_number: { message: "Informe o número da unidade.", tone: "error" },
  unit_created: { message: "Unidade cadastrada com sucesso.", tone: "success" },
  unit_deleted: { message: "Unidade removida com sucesso.", tone: "success" },
  unit_has_residents: {
    message:
      "Não é possível remover esta unidade pois existem moradores vinculados a ela. Desvincule os moradores primeiro.",
    tone: "error"
  },
  unit_not_found: { message: "Unidade não encontrada no condomínio ativo.", tone: "error" },
  unit_updated: { message: "Unidade atualizada com sucesso.", tone: "success" },
  update_unit_failed: { message: "Não foi possível atualizar a unidade.", tone: "error" }
};

export default async function UnitsPage({ searchParams }: { searchParams: SearchParams }) {
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "units");
  const params = await searchParams;
  const search = sanitizeUnitSearch(params.q ?? "").toLowerCase();
  const selectedBlock = (params.block ?? "").trim();
  const occupancyFilter = (params.occupancy ?? "all").trim();
  const rawStatus = (params.feedback ?? params.status ?? "").trim();
  const feedback = rawStatus ? feedbackMessages[rawStatus] : undefined;
  const supabase = await createServerSupabaseClient();

  const [{ data: unitsData, error: unitsError }, { data: residentUnitsData }, { data: residentsData }] =
    await Promise.all([
      supabase
        .from("units")
        .select("id, block, number, floor, metadata, created_at")
        .eq("tenant_id", context.profile.tenantId)
        .eq("condominium_id", context.condominium.id)
        .order("block", { ascending: true, nullsFirst: false })
        .order("number", { ascending: true }),
      supabase
        .from("resident_units")
        .select("id, resident_id, unit_id, relationship, is_primary")
        .eq("tenant_id", context.profile.tenantId)
        .eq("condominium_id", context.condominium.id),
      supabase
        .from("residents")
        .select("id, full_name, status")
        .eq("tenant_id", context.profile.tenantId)
        .eq("condominium_id", context.condominium.id)
    ]);

  const rawUnits = (unitsData ?? []) as Unit[];
  const rawResidentUnits = (residentUnitsData ?? []) as ResidentUnit[];
  const rawResidents = (residentsData ?? []) as Resident[];

  const residentsById = new Map(rawResidents.map((resident) => [resident.id, resident]));

  const residentUnitsByUnitId = new Map<string, ResidentUnit[]>();
  for (const ru of rawResidentUnits) {
    const list = residentUnitsByUnitId.get(ru.unit_id) ?? [];
    list.push(ru);
    residentUnitsByUnitId.set(ru.unit_id, list);
  }

  // Metrics
  const totalUnits = rawUnits.length;
  const distinctBlocks = Array.from(
    new Set(rawUnits.map((u) => u.block).filter((b): b is string => Boolean(b)))
  ).sort();

  let occupiedCount = 0;
  let vacantCount = 0;

  for (const unit of rawUnits) {
    const linked = residentUnitsByUnitId.get(unit.id) ?? [];
    if (linked.length > 0) {
      occupiedCount++;
    } else {
      vacantCount++;
    }
  }

  // Filter units
  const filteredUnits = rawUnits.filter((unit) => {
    const meta = parseUnitMetadata(unit.metadata);
    const linkedResidents = residentUnitsByUnitId.get(unit.id) ?? [];
    const isOccupied = linkedResidents.length > 0;

    if (occupancyFilter === "occupied" && !isOccupied) return false;
    if (occupancyFilter === "vacant" && isOccupied) return false;

    if (selectedBlock && (unit.block ?? "") !== selectedBlock) {
      return false;
    }

    if (search) {
      const matchBlock = (unit.block ?? "").toLowerCase().includes(search);
      const matchNumber = unit.number.toLowerCase().includes(search);
      const matchFloor = (unit.floor ?? "").toLowerCase().includes(search);
      const matchIntercom = (meta.intercom ?? "").toLowerCase().includes(search);
      const matchParking = (meta.parkingSpaces ?? "").toLowerCase().includes(search);
      const matchNotes = (meta.notes ?? "").toLowerCase().includes(search);
      const matchResident = linkedResidents.some((ru) =>
        residentsById.get(ru.resident_id)?.full_name.toLowerCase().includes(search)
      );

      return (
        matchBlock ||
        matchNumber ||
        matchFloor ||
        matchIntercom ||
        matchParking ||
        matchNotes ||
        matchResident
      );
    }

    return true;
  });

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Unidades</h1>
          <p className="muted">
            Gestão operacional de apartamentos, casas, blocos/quadras, andares, ramais e vagas do{" "}
            <strong>{context.condominium.name}</strong>.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar ao painel
        </Link>
      </header>

      {feedback ? (
        <section
          className={`feedback ${feedback.tone === "success" ? "success" : "destructive"}`}
          role="alert"
        >
          {feedback.message}
        </section>
      ) : null}

      {unitsError ? (
        <section className="feedback destructive" role="alert">
          Falha ao carregar a lista de unidades do condomínio.
        </section>
      ) : null}

      <section className="condo-overview">
        <div className="metric-card">
          <span>Total de Unidades</span>
          <strong>{totalUnits}</strong>
        </div>
        <div className="metric-card">
          <span>Unidades Ocupadas</span>
          <strong>{occupiedCount}</strong>
        </div>
        <div className="metric-card">
          <span>Unidades Vagas</span>
          <strong>{vacantCount}</strong>
        </div>
        <div className="metric-card">
          <span>Blocos / Quadras</span>
          <strong>{distinctBlocks.length > 0 ? distinctBlocks.length : "Geral"}</strong>
        </div>
      </section>

      {/* Formulário de nova unidade posicionado antes da listagem */}
      <section className="admin-section" style={{ marginBottom: "24px" }}>
        <h2>Nova Unidade</h2>
        <p className="section-description">
          Cadastre um novo apartamento, casa ou sala no condomínio ativo.
        </p>

        <form action={createUnitAction} className="admin-form">
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))"
            }}
          >
            <label>
              Número da Unidade *
              <input name="number" placeholder="Ex: 101, 12B, Casa 4" required />
            </label>

            <label>
              Bloco/Quadra
              <input name="block" placeholder="Ex: A, 1, Quadra 4" />
            </label>

            <label>
              Andar
              <input name="floor" placeholder="Ex: 1, 2, Cobertura" />
            </label>

            <label>
              Tipo de Imóvel
              <select defaultValue="apartment" name="unitType">
                {unitTypes.map((type) => (
                  <option key={type} value={type}>
                    {unitTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ramal / Interfone
              <input name="intercom" placeholder="Ex: 2101, 101" />
            </label>

            <label>
              Vagas de Garagem
              <input name="parkingSpaces" placeholder="Ex: G1-12, G1-13" />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Observações internas
              <textarea
                name="notes"
                placeholder="Informações relevantes sobre a unidade..."
                rows={2}
              />
            </label>
          </div>

          <div>
            <button type="submit">Cadastrar Unidade</button>
          </div>
        </form>
      </section>

      {/* Toolbar e Listagem de Unidades */}
      <section className="toolbar">
        <form className="filter-form">
          <label>
            Buscar unidade ou morador
            <input
              defaultValue={params.q ?? ""}
              name="q"
              placeholder="Número, bloco/quadra, andar, ramal, vaga ou morador..."
            />
          </label>

          {distinctBlocks.length > 0 ? (
            <label>
              Bloco/Quadra
              <select defaultValue={params.block ?? ""} name="block">
                <option value="">Todos os blocos/quadras</option>
                {distinctBlocks.map((b) => (
                  <option key={b} value={b}>
                    Bloco/Quadra {b}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label>
            Ocupação
            <select defaultValue={params.occupancy ?? "all"} name="occupancy">
              <option value="all">Todas as unidades</option>
              <option value="occupied">Apenas ocupadas</option>
              <option value="vacant">Apenas vagas</option>
            </select>
          </label>

          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href="/dashboard/units">
            Limpar
          </Link>
        </form>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <div>
            <h2>Unidades Cadastradas ({filteredUnits.length})</h2>
            <p className="section-description">
              Lista de unidades, metadados e vínculos com moradores do condomínio ativo.
            </p>
          </div>
        </div>

        {filteredUnits.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma unidade encontrada</strong>
            <p>Nenhuma unidade corresponde aos critérios de busca ou filtros selecionados.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Unidade</th>
                  <th>Tipo & Metadados</th>
                  <th>Moradores</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => {
                  const meta = parseUnitMetadata(unit.metadata);
                  const linked = residentUnitsByUnitId.get(unit.id) ?? [];
                  const isOccupied = linked.length > 0;
                  const unitLabelText = formatUnitLabel(unit);

                  return (
                    <tr key={unit.id}>
                      <td>
                        <strong>{unitLabelText}</strong>
                        <span className="table-detail">
                          <span
                            className={`status-badge ${isOccupied ? "active" : "inactive"}`}
                            style={{ marginRight: "6px" }}
                          >
                            {isOccupied ? "Ocupada" : "Vaga"}
                          </span>
                          {meta.unitType ? unitTypeLabels[meta.unitType] : "Residencial"}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "grid", gap: "2px", fontSize: "0.85rem" }}>
                          {meta.intercom ? (
                            <span>
                              📞 Ramal: <strong>{meta.intercom}</strong>
                            </span>
                          ) : null}
                          {meta.parkingSpaces ? (
                            <span>
                              🚗 Vagas: <strong>{meta.parkingSpaces}</strong>
                            </span>
                          ) : null}
                          {meta.notes ? (
                            <small className="muted" style={{ margin: 0 }}>
                              📝 {meta.notes}
                            </small>
                          ) : null}
                          {!meta.intercom && !meta.parkingSpaces && !meta.notes ? (
                            <span className="muted" style={{ margin: 0 }}>
                              Sem detalhes adicionais
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        {linked.length === 0 ? (
                          <span className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                            Nenhum morador vinculado
                          </span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {linked.map((ru) => {
                              const resident = residentsById.get(ru.resident_id);
                              if (!resident) return null;

                              return (
                                <Link
                                  className="status-badge inactive"
                                  href={`/dashboard/residents?unitId=${unit.id}`}
                                  key={ru.id}
                                  style={{ textDecoration: "none" }}
                                  title={`Ver morador ${resident.full_name}`}
                                >
                                  {resident.full_name} (
                                  {relationshipLabels[ru.relationship] ?? ru.relationship})
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <details className="record-details">
                          <summary>Editar</summary>
                          <form action={updateUnitAction} className="edit-unit-form admin-form">
                            <input name="unitId" type="hidden" value={unit.id} />

                            <h3 style={{ margin: "0 0 10px" }}>Editar {unitLabelText}</h3>

                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr 1fr" }}>
                              <label>
                                Número *
                                <input defaultValue={unit.number} name="number" required />
                              </label>

                              <label>
                                Bloco/Quadra
                                <input defaultValue={unit.block ?? ""} name="block" />
                              </label>

                              <label>
                                Andar
                                <input defaultValue={unit.floor ?? ""} name="floor" />
                              </label>

                              <label>
                                Tipo
                                <select defaultValue={meta.unitType ?? "apartment"} name="unitType">
                                  {unitTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {unitTypeLabels[type]}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                Ramal / Interfone
                                <input defaultValue={meta.intercom ?? ""} name="intercom" />
                              </label>

                              <label>
                                Vagas de Garagem
                                <input defaultValue={meta.parkingSpaces ?? ""} name="parkingSpaces" />
                              </label>

                              <label style={{ gridColumn: "1 / -1" }}>
                                Observações internas
                                <textarea defaultValue={meta.notes ?? ""} name="notes" rows={2} />
                              </label>
                            </div>

                            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                              <button style={{ flex: 1 }} type="submit">
                                Salvar Alterações
                              </button>
                            </div>
                          </form>
                        </details>

                        <DeleteUnitButton
                          deleteAction={deleteUnitAction}
                          unitId={unit.id}
                          unitLabel={unitLabelText}
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
