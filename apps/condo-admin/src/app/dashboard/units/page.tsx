import Link from "next/link";
import { createUnitAction, deleteUnitAction, updateUnitAction } from "../actions";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{
  q?: string;
  status?: string;
}>;

export const dynamic = "force-dynamic";

function sanitizeSearch(value: string) {
  return value.replace(/[%,]/g, "").trim();
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

  if (status?.includes("failed") || status?.startsWith("missing")) {
    return null;
  }

  return status ? `Operação concluída: ${status}` : null;
}

function errorMessage(status?: string) {
  if (status === "missing_unit_fields") {
    return "Informe ao menos o numero da unidade.";
  }

  if (status === "missing_unit_id") {
    return "Não foi possível identificar a unidade.";
  }

  if (status === "create_unit_failed") {
    return "Não foi possível criar a unidade.";
  }

  if (status === "update_unit_failed") {
    return "Não foi possível atualizar a unidade.";
  }

  if (status === "delete_unit_failed") {
    return "Não foi possível remover a unidade.";
  }

  return status?.includes("failed") ? `Não foi possível concluir: ${status}` : null;
}

export default async function UnitsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "units");
  const params = await searchParams;

  const { condominium } = context;
  const q = params.q?.trim() ?? "";
  const filterQ = sanitizeSearch(q);
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("units")
    .select("id, block, number, floor")
    .eq("condominium_id", condominium.id)
    .order("block", { ascending: true })
    .order("number", { ascending: true });

  if (filterQ) {
    query = query.or(`block.ilike.%${filterQ}%,number.ilike.%${filterQ}%,floor.ilike.%${filterQ}%`);
  }

  const { data: units, error } = await query;
  const success = statusMessage(params.status);
  const failure = errorMessage(params.status);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Unidades</h1>
          <p className="muted">
            Cadastro de unidades do {condominium.name}. Esta tela trabalha somente no condomínio
            ativo do usuário.
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
        <form className="filter-form">
          <label>
            Buscar
            <input name="q" placeholder="Bloco, numero ou andar" defaultValue={q} />
          </label>
          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href="/dashboard/units">
            Limpar
          </Link>
        </form>
      </section>

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Unidades cadastradas</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bloco</th>
                  <th>Número</th>
                  <th>Andar</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(units ?? []).map((unit) => (
                  <tr key={unit.id}>
                    <td colSpan={4}>
                      <form className="inline-form" action={updateUnitAction}>
                        <input type="hidden" name="condominiumId" value={condominium.id} />
                        <input type="hidden" name="unitId" value={unit.id} />
                        <input name="block" defaultValue={unit.block ?? ""} placeholder="Bloco" />
                        <input name="number" defaultValue={unit.number} required />
                        <input name="floor" defaultValue={unit.floor ?? ""} placeholder="Andar" />
                        <button type="submit">Salvar</button>
                        <button
                          className="secondary"
                          form={`delete-unit-${unit.id}`}
                          type="submit"
                        >
                          Remover
                        </button>
                      </form>
                      <form action={deleteUnitAction} id={`delete-unit-${unit.id}`}>
                        <input type="hidden" name="condominiumId" value={condominium.id} />
                        <input type="hidden" name="unitId" value={unit.id} />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!units?.length ? <p className="muted">Nenhuma unidade encontrada.</p> : null}
        </div>

        <div className="admin-section">
          <h2>Nova unidade</h2>
          <form className="admin-form" action={createUnitAction}>
            <input type="hidden" name="condominiumId" value={condominium.id} />
            <label>
              Bloco
              <input name="block" placeholder="A" />
            </label>
            <label>
              Número
              <input name="number" required placeholder="101" />
            </label>
            <label>
              Andar
              <input name="floor" placeholder="1" />
            </label>
            <button type="submit">Adicionar unidade</button>
          </form>
        </div>
      </section>
    </main>
  );
}
