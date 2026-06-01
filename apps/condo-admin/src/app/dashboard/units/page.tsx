import { UnitsManagement } from "./UnitsManagement";
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
    return "Informe ao menos o número da unidade.";
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
      </header>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {error ? <p className="form-error">Falha ao carregar unidades.</p> : null}

      <UnitsManagement condominiumId={condominium.id} query={q} units={units ?? []} />
    </main>
  );
}
