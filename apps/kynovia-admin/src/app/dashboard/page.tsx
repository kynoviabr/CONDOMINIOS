import { KynoviaAdminShell } from "./_components/KynoviaAdminShell";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import {
  clientFromMetadata,
  contractExpiresWithinDays,
  financeFromMetadata,
  formatCurrency,
  isInactiveClient,
  monthlyValue
} from "../../lib/customers/metadata";

type CondominiumSummary = {
  metadata: unknown;
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireAuthorizedProfile();
  const supabase = await createServerSupabaseClient();
  const { data: condominiums, error } = await supabase
    .from("condominiums")
    .select("metadata")
    .eq("tenant_id", profile.tenantId);

  const clients = ((condominiums ?? []) as CondominiumSummary[]).map((condominium) => ({
    client: clientFromMetadata(condominium.metadata),
    finance: financeFromMetadata(condominium.metadata)
  }));
  const activeClients = clients.filter((client) => !isInactiveClient(client.finance)).length;
  const overdueClients = clients.filter((client) => client.finance.billing_status === "overdue").length;
  const mrr = clients.reduce((total, client) => total + monthlyValue(client.client), 0);
  const expiringContracts = clients.filter((client) => contractExpiresWithinDays(client.client, 60)).length;

  return (
    <KynoviaAdminShell
      active="dashboard"
      title="Dashboard"
      description="Visão geral comercial e SaaS da Kynovia. A operação diaria dos condomínios fica no Condo Admin."
      profile={profile}
    >
      {error ? <p className="form-error">Falha ao carregar indicadores do dashboard.</p> : null}

      <section className="dashboard-metrics">
        <div className="metric-card">
          <span>Clientes ativos</span>
          <strong>{activeClients}</strong>
        </div>
        <div className="metric-card">
          <span>Faturas em atraso</span>
          <strong>{overdueClients}</strong>
        </div>
        <div className="metric-card">
          <span>MRR</span>
          <strong>{formatCurrency(mrr)}</strong>
        </div>
        <div className="metric-card">
          <span>Tickets / Problemas</span>
          <strong>0</strong>
        </div>
        <div className="metric-card">
          <span>Tickets / Melhorias</span>
          <strong>0</strong>
        </div>
        <div className="metric-card">
          <span>Contratos a vencer em 60 dias</span>
          <strong>{expiringContracts}</strong>
        </div>
      </section>
    </KynoviaAdminShell>
  );
}
