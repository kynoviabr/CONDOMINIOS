import Link from "next/link";
import { createCondominiumAction } from "./actions";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{
  error?: string;
  q?: string;
  status?: string;
  timezone?: string;
}>;

export const dynamic = "force-dynamic";

function canCreateCondominium(role: string) {
  return ["platform_admin", "tenant_admin"].includes(role);
}

export default async function CondominiumsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireAuthorizedProfile();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const filterQ = q.replace(/[%,]/g, "");
  const timezone = params.timezone?.trim() ?? "";
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("condominiums")
    .select("id, name, slug, timezone, visitor_parking_capacity, created_at")
    .eq("tenant_id", profile.tenantId)
    .order("name", { ascending: true });

  if (filterQ) {
    query = query.or(`name.ilike.%${filterQ}%,slug.ilike.%${filterQ}%`);
  }

  if (timezone) {
    query = query.eq("timezone", timezone);
  }

  const { data: condominiums, error } = await query;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Gestão administrativa</p>
          <h1>Condomínios</h1>
          <p className="muted">
            Cadastro, configurações, unidades, portoes e filtros por tenant.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar
        </Link>
      </header>

      {params.status ? <p className="form-success">Operação concluída: {params.status}</p> : null}
      {params.error ? <p className="form-error">Não foi possível concluir: {params.error}</p> : null}
      {error ? <p className="form-error">Falha ao carregar condomínios.</p> : null}

      <section className="toolbar">
        <form className="filter-form">
          <label>
            Buscar
            <input name="q" placeholder="Nome ou slug" defaultValue={q} />
          </label>
          <label>
            Timezone
            <input name="timezone" placeholder="America/Sao_Paulo" defaultValue={timezone} />
          </label>
          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href="/dashboard/condominiums">
            Limpar
          </Link>
        </form>
      </section>

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Condomínios cadastrados</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Slug</th>
                  <th>Timezone</th>
                  <th>Vagas visitantes</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(condominiums ?? []).map((condominium) => (
                  <tr key={condominium.id}>
                    <td>{condominium.name}</td>
                    <td>{condominium.slug}</td>
                    <td>{condominium.timezone}</td>
                    <td>{condominium.visitor_parking_capacity}</td>
                    <td>
                      <Link className="text-link compact" href={`/dashboard/condominiums/${condominium.id}`}>
                        Gerenciar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!condominiums?.length ? <p className="muted">Nenhum condomínio encontrado.</p> : null}
        </div>

        <div className="admin-section">
          <h2>Novo condomínio</h2>
          {canCreateCondominium(profile.role) ? (
            <form className="admin-form" action={createCondominiumAction}>
              <label>
                Nome
                <input name="name" required placeholder="Residencial Aurora" />
              </label>
              <label>
                Slug
                <input name="slug" placeholder="residencial-aurora" />
              </label>
              <label>
                Timezone
                <input name="timezone" defaultValue="America/Sao_Paulo" />
              </label>
              <button type="submit">Criar condomínio</button>
            </form>
          ) : (
            <p className="muted">Seu perfil pode consultar condomínios, mas não criar novos registros.</p>
          )}
        </div>
      </section>
    </main>
  );
}
