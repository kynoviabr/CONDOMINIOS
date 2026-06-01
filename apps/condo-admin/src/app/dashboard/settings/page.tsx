import { updateCondominiumAction } from "../actions";
import { SettingsCondominiumFields } from "./SettingsCondominiumFields";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";

type SearchParams = Promise<{
  onboarding?: string;
  status?: string;
}>;

export const dynamic = "force-dynamic";

function statusMessage(status?: string) {
  if (status === "condominium_updated") {
    return "Dados do condominio atualizados.";
  }

  if (status === "settings_updated") {
    return "Configuracoes operacionais atualizadas.";
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
  if (status === "missing_condominium_fields") {
    return "Revise os campos obrigatorios e formatos do condominio.";
  }

  if (status === "invalid_condominium_fields") {
    return "Revise CNPJ, CEP, telefone, WhatsApp, e-mail, UF, timezone e tipo de condominio.";
  }

  if (status === "missing_condominium_id") {
    return "Nao foi possivel identificar o condominio ativo.";
  }

  if (status === "missing_unit_structure") {
    return "Escolha se o condominio e vertical ou horizontal.";
  }

  if (status === "update_condominium_failed") {
    return "Nao foi possivel atualizar os dados do condominio.";
  }

  if (status === "update_settings_failed") {
    return "Nao foi possivel atualizar as configuracoes operacionais.";
  }

  if (status === "unit_structure_failed") {
    return "Nao foi possivel salvar o tipo de condominio.";
  }

  return status?.includes("failed") ? `Nao foi possivel concluir: ${status}` : null;
}

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "settings");
  const params = await searchParams;

  const { condominium } = context;
  const success = statusMessage(params.status);
  const failure = errorMessage(params.status);
  const showOnboarding = params.onboarding === "unit_structure" && !condominium.unitRegistrationMode;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Configuracoes</h1>
          <p className="muted">
            Ajustes simples do ambiente operacional do condominio. Configuracoes avancadas ficam
            ocultas para reduzir risco e complexidade.
          </p>
        </div>
      </header>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {showOnboarding ? (
        <section className="onboarding-callout">
          <strong>Primeira configuracao obrigatoria</strong>
          <p>
            Escolha o tipo de condominio para liberar o cadastro de unidades no formato correto.
          </p>
        </section>
      ) : null}
      <section className="settings-grid settings-grid-single">
        <div className="admin-section">
          <h2>Dados gerais do condominio</h2>
          <p className="muted">
            Nome e timezone usados nos cadastros, convites e operacao da portaria.
          </p>
          <form className="admin-form" action={updateCondominiumAction}>
            <input type="hidden" name="condominiumId" value={condominium.id} />
            <SettingsCondominiumFields condominium={condominium} />
            <button type="submit">Salvar dados</button>
          </form>
        </div>
      </section>
    </main>
  );
}
