import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createUnitAction,
  deleteSelectedUnitsAction,
  updateUnitAction
} from "../actions";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{
  block?: string;
  number?: string;
  status?: string;
}>;

export const dynamic = "force-dynamic";

type Unit = {
  block: string | null;
  floor: string | null;
  id: string;
  metadata: unknown;
  number: string;
};

function sanitizeSearch(value: string) {
  return value.replace(/[%,]/g, "").trim();
}

function uniqueSortedValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
}

function unitMetadata(unit: Unit) {
  return unit.metadata && typeof unit.metadata === "object" && !Array.isArray(unit.metadata)
    ? (unit.metadata as Record<string, unknown>)
    : {};
}

function metadataValue(unit: Unit, key: string) {
  const value = unitMetadata(unit)[key];
  return typeof value === "string" ? value : "";
}

function unitRegistrationMode(unit: Unit) {
  const mode = metadataValue(unit, "registrationMode");
  return mode === "horizontal" || mode === "vertical" ? mode : null;
}

function statusMessage(status?: string) {
  if (status === "unit_created") {
    return "Unidade criada.";
  }

  if (status === "unit_updated") {
    return "Unidade atualizada.";
  }

  if (status === "unit_deleted") {
    return "Unidade removida.";
  }

  if (status === "unit_structure_updated") {
    return "Tipo de condominio atualizado.";
  }

  if (status?.includes("failed") || status?.startsWith("missing")) {
    return null;
  }

  return status ? `Operacao concluida: ${status}` : null;
}

function errorMessage(status?: string) {
  if (status === "missing_unit_fields") {
    return "Informe ao menos o numero da unidade.";
  }

  if (status === "missing_unit_structure") {
    return "Escolha se o condominio e vertical ou horizontal.";
  }

  if (status === "missing_unit_id") {
    return "Nao foi possivel identificar a unidade.";
  }

  if (status === "create_unit_failed") {
    return "Nao foi possivel criar a unidade.";
  }

  if (status === "update_unit_failed") {
    return "Nao foi possivel atualizar a unidade.";
  }

  if (status === "delete_unit_failed") {
    return "Nao foi possivel remover a unidade.";
  }

  if (status === "unit_structure_failed") {
    return "Nao foi possivel salvar o tipo de condominio.";
  }

  return status?.includes("failed") ? `Nao foi possivel concluir: ${status}` : null;
}

export default async function UnitsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "units");
  const params = await searchParams;

  const { condominium } = context;
  const configuredUnitMode = condominium.unitRegistrationMode;
  const selectedBlock = sanitizeSearch(params.block ?? "");
  const selectedNumber = sanitizeSearch(params.number ?? "");
  const supabase = await createServerSupabaseClient();

  const { data: allUnitsData } = await supabase
    .from("units")
    .select("block, number, floor, metadata")
    .eq("condominium_id", condominium.id)
    .order("block", { ascending: true })
    .order("number", { ascending: true });

  const allUnits = (allUnitsData ?? []) as Array<Omit<Unit, "id">>;
  const blockOptions = uniqueSortedValues(allUnits.map((unit) => unit.block));
  const numberOptions = uniqueSortedValues(
    allUnits
      .filter((unit) => !selectedBlock || unit.block === selectedBlock)
      .map((unit) => unit.number)
  );

  let query = supabase
    .from("units")
    .select("id, block, number, floor, metadata")
    .eq("condominium_id", condominium.id)
    .order("block", { ascending: true })
    .order("number", { ascending: true });

  if (selectedBlock) {
    query = query.eq("block", selectedBlock);
  }

  if (selectedNumber) {
    query = query.eq("number", selectedNumber);
  }

  const { data: unitsData, error } = await query;
  const units = (unitsData ?? []) as Unit[];
  const inferredUnitMode = units.map(unitRegistrationMode).find(Boolean) ?? null;
  const activeUnitMode = configuredUnitMode ?? inferredUnitMode;

  if (!activeUnitMode) {
    redirect("/dashboard/settings?onboarding=unit_structure");
  }

  const isHorizontal = activeUnitMode === "horizontal";
  const createFormClassName = isHorizontal
    ? "unit-create-form unit-create-form-horizontal"
    : "unit-create-form unit-create-form-vertical";
  const success = statusMessage(params.status);
  const failure = errorMessage(params.status);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Unidades</h1>
          <p className="muted">
            Cadastro de unidades do {condominium.name}. Esta tela trabalha somente no condominio
            ativo do usuario.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar
        </Link>
      </header>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {error ? <p className="form-error">Falha ao carregar unidades.</p> : null}

      <section className="toolbar">
        <form className="filter-form unit-filter-form">
          <label>
            {isHorizontal ? "Quadra" : "Bloco"}
            <select name="block" defaultValue={selectedBlock}>
              <option value="">{isHorizontal ? "Todas as quadras" : "Todos os blocos"}</option>
              {blockOptions.map((block) => (
                <option key={block} value={block}>
                  {block}
                </option>
              ))}
            </select>
          </label>
          <label>
            {isHorizontal ? "Lote" : "Unidade"}
            <select name="number" defaultValue={selectedNumber}>
              <option value="">{isHorizontal ? "Todos os lotes" : "Todas as unidades"}</option>
              {numberOptions.map((number) => (
                <option key={number} value={number}>
                  {number}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href="/dashboard/units">
            Limpar
          </Link>
        </form>
      </section>

      <section className="admin-section">
          <h2>Unidades cadastradas</h2>
          <p className="muted">
            Cadastre novas unidades, edite dados existentes e remova varias unidades selecionadas
            em uma unica acao.
          </p>
          <form className={createFormClassName} action={createUnitAction}>
            <input type="hidden" name="condominiumId" value={condominium.id} />
            <input type="hidden" name="unitRegistrationMode" value={activeUnitMode} />
            {isHorizontal ? (
              <>
                <label className="unit-create-field unit-create-field-block">
                  Quadra
                  <input maxLength={4} name="horizontalBlock" placeholder="Qd." />
                </label>
                <label className="unit-create-field unit-create-field-lot">
                  Lote
                  <input maxLength={4} name="horizontalNumber" placeholder="Lote" required />
                </label>
                <label className="unit-create-field unit-create-field-street">
                  Endereco
                  <input name="street" placeholder="Rua, avenida ou alameda" />
                </label>
                <label className="unit-create-field unit-create-field-number">
                  Numero
                  <input maxLength={8} name="addressNumber" placeholder="Numero" />
                </label>
                <label className="unit-create-field unit-create-field-complement">
                  Complemento
                  <input maxLength={3} name="complement" placeholder="Ex.: F1" />
                </label>
                <button className="unit-create-save" type="submit">Adicionar</button>
              </>
            ) : (
              <>
                <label>
                  Bloco
                  <input name="verticalBlock" placeholder="Ex.: Torre A" />
                </label>
                <label>
                  Andar
                  <input name="verticalFloor" placeholder="Ex.: 12" />
                </label>
                <label>
                  Unidade
                  <input name="verticalNumber" placeholder="Ex.: 1204" required />
                </label>
                <label>
                  Complemento
                  <input name="complement" placeholder="Observacao interna" />
                </label>
                <button type="submit">Adicionar unidade</button>
              </>
            )}
          </form>
          <form action={deleteSelectedUnitsAction} id="delete-selected-units">
            <input type="hidden" name="condominiumId" value={condominium.id} />
          </form>
          <div className="bulk-actions">
            <button
              className="secondary"
              disabled={!units.length}
              form="delete-selected-units"
              type="submit"
            >
              Excluir selecionadas
            </button>
          </div>
          <div className="unit-list-wrap">
            <div className="unit-list-rows">
              {units.map((unit) => {
                const rowMode = configuredUnitMode ?? unitRegistrationMode(unit);
                const rowIsHorizontal = (rowMode ?? activeUnitMode) === "horizontal";

                return (
                  <div
                    className={
                      rowIsHorizontal
                        ? "unit-list-row unit-list-row-horizontal"
                        : "unit-list-row unit-list-row-vertical"
                    }
                    key={unit.id}
                  >
                    <input
                      aria-label={`Selecionar unidade ${unit.number}`}
                      form="delete-selected-units"
                      name="unitIds"
                      type="checkbox"
                      value={unit.id}
                    />
                    <form
                      className={
                        rowIsHorizontal
                          ? "unit-row-form unit-row-form-horizontal"
                          : "unit-row-form unit-row-form-vertical"
                      }
                      action={updateUnitAction}
                    >
                      <input type="hidden" name="condominiumId" value={condominium.id} />
                      <input type="hidden" name="unitId" value={unit.id} />
                      <input
                        type="hidden"
                        name="unitRegistrationMode"
                        value={rowMode ?? activeUnitMode}
                      />
                      <label className="unit-row-field unit-row-field-block">
                        {rowIsHorizontal ? "Quadra" : "Bloco"}
                        <input
                          name="block"
                          defaultValue={unit.block ?? ""}
                          maxLength={rowIsHorizontal ? 4 : undefined}
                          placeholder={rowIsHorizontal ? "Qd." : "Bloco"}
                          aria-label={rowIsHorizontal ? "Quadra" : "Bloco"}
                        />
                      </label>
                      {rowIsHorizontal ? (
                        <>
                          <label className="unit-row-field unit-row-field-lot">
                            Lote
                            <input
                              name="number"
                              defaultValue={unit.number}
                              maxLength={4}
                              placeholder="Lote"
                              aria-label="Lote"
                              required
                            />
                          </label>
                          <label className="unit-row-field unit-row-field-street">
                            Endereco
                            <input
                              name="street"
                              defaultValue={metadataValue(unit, "street")}
                              placeholder="Rua, avenida ou alameda"
                              aria-label="Endereco"
                            />
                          </label>
                          <label className="unit-row-field unit-row-field-number">
                            Numero
                            <input
                              name="addressNumber"
                              defaultValue={metadataValue(unit, "addressNumber")}
                              maxLength={8}
                              placeholder="Numero"
                              aria-label="Numero"
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="unit-row-field unit-row-field-floor">
                            Andar
                            <input
                              name="floor"
                              defaultValue={unit.floor ?? ""}
                              placeholder="Andar"
                              aria-label="Andar"
                            />
                          </label>
                          <label className="unit-row-field unit-row-field-unit">
                            Unidade
                            <input
                              name="number"
                              defaultValue={unit.number}
                              placeholder="Unidade"
                              aria-label="Unidade"
                              required
                            />
                          </label>
                        </>
                      )}
                      <label className="unit-row-field unit-row-field-complement">
                        Complemento
                        <input
                          name="complement"
                          defaultValue={metadataValue(unit, "complement")}
                          maxLength={3}
                          placeholder="Compl."
                          aria-label="Complemento"
                        />
                      </label>
                      <button className="unit-row-save" type="submit">Salvar</button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
          {!units.length ? <p className="muted">Nenhuma unidade encontrada.</p> : null}
      </section>
    </main>
  );
}
