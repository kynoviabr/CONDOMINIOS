import Link from "next/link";
import {
  updateCondominiumAction,
  updateOperationalSettingsAction
} from "../actions";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";

type SearchParams = Promise<{
  status?: string;
}>;

export const dynamic = "force-dynamic";

function statusMessage(status?: string) {
  if (status === "condominium_updated") {
    return "Dados do condomínio atualizados.";
  }

  if (status === "settings_updated") {
    return "Configurações operacionais atualizadas.";
  }

  if (status?.includes("failed") || status?.startsWith("missing")) {
    return null;
  }

  return status ? `Operação concluída: ${status}` : null;
}

function errorMessage(status?: string) {
  if (status === "missing_condominium_fields") {
    return "Informe o nome do condomínio.";
  }

  if (status === "missing_condominium_id") {
    return "Não foi possível identificar o condomínio ativo.";
  }

  if (status === "update_condominium_failed") {
    return "Não foi possível atualizar os dados do condomínio.";
  }

  if (status === "update_settings_failed") {
    return "Não foi possível atualizar as configurações operacionais.";
  }

  return status?.includes("failed") ? `Não foi possível concluir: ${status}` : null;
}

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "settings");
  const params = await searchParams;

  const { condominium } = context;
  const success = statusMessage(params.status);
  const failure = errorMessage(params.status);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Configurações do condomínio</h1>
          <p className="muted">
            Ajustes simples do ambiente operacional do condomínio. Configurações avançadas ficam
            ocultas para reduzir risco e complexidade.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar
        </Link>
      </header>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Dados basicos</h2>
          <p className="muted">
            Nome e timezone usados nos cadastros, convites e operação da portaria.
          </p>
          <form className="admin-form" action={updateCondominiumAction}>
            <input type="hidden" name="condominiumId" value={condominium.id} />
            <label>
              Nome do condomínio
              <input name="name" defaultValue={condominium.name} required />
            </label>
            <label>
              Identificador
              <input value={condominium.slug} readOnly aria-readonly="true" />
            </label>
            <label>
              Timezone
              <input name="timezone" defaultValue={condominium.timezone} required />
            </label>
            <button type="submit">Salvar dados</button>
          </form>
        </div>

        <div className="admin-section">
          <h2>Operação</h2>
          <p className="muted">
            Parâmetros diários expostos ao administrador do condomínio. Campos técnicos em JSON não
            aparecem nesta tela.
          </p>
          <form className="admin-form" action={updateOperationalSettingsAction}>
            <input type="hidden" name="condominiumId" value={condominium.id} />
            <label>
              Vagas de visitantes
              <input
                min="0"
                name="visitorParkingCapacity"
                type="number"
                defaultValue={condominium.visitorParkingCapacity}
              />
            </label>
            <button type="submit">Salvar operação</button>
          </form>
        </div>
      </section>
    </main>
  );
}
