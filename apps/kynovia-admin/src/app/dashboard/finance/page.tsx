import Link from "next/link";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type CondominiumSummary = {
  id: string;
  metadata: unknown;
  name: string;
};

type FinanceSummary = {
  access_status?: string | null;
  billing_status?: string | null;
  blocked?: boolean | null;
  blocked_reason?: string | null;
  inactive_reason?: string | null;
  payments?: Array<{
    amount?: number | null;
    paid_at?: string | null;
  }>;
};

type ClientFinanceSummary = CondominiumSummary & {
  finance: FinanceSummary;
};

export const dynamic = "force-dynamic";

function financeFromMetadata(metadata: unknown): FinanceSummary {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const finance = (metadata as { finance?: unknown }).finance;
  return finance && typeof finance === "object" && !Array.isArray(finance) ? (finance as FinanceSummary) : {};
}

function isInactiveClient(finance: FinanceSummary) {
  return finance.blocked === true || finance.access_status === "inactive" || finance.billing_status === "overdue";
}

function statusReason(finance: FinanceSummary) {
  if (finance.billing_status === "overdue") {
    return finance.blocked_reason ?? "Pagamento em atraso.";
  }

  return finance.blocked_reason ?? finance.inactive_reason ?? "Sem motivo informado.";
}

function paymentTotal(client: ClientFinanceSummary) {
  return (client.finance.payments ?? []).reduce(
    (total, payment) => total + (typeof payment.amount === "number" ? payment.amount : 0),
    0
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

export default async function FinanceDashboardPage() {
  const profile = await requireAuthorizedProfile();
  const supabase = await createServerSupabaseClient();
  const { data: condominiums, error } = await supabase
    .from("condominiums")
    .select("id, name, metadata")
    .eq("tenant_id", profile.tenantId)
    .order("name", { ascending: true });

  const clients: ClientFinanceSummary[] = ((condominiums ?? []) as CondominiumSummary[]).map((condominium) => ({
    ...condominium,
    finance: financeFromMetadata(condominium.metadata)
  }));
  const inactiveClients = clients.filter((client) => isInactiveClient(client.finance));
  const activeClients = clients.filter((client) => !isInactiveClient(client.finance));
  const totalPayments = clients.reduce((total, client) => total + paymentTotal(client), 0);
  const maxPaymentTotal = Math.max(...clients.map(paymentTotal), 1);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Kynovia Condo Admin</p>
          <h1>Financeiro dos clientes</h1>
          <p className="muted">
            Gestão financeira centralizada, pagamentos, inadimplência e bloqueio de uso dos clientes.
          </p>
        </div>
        <div className="shell-actions">
          <Link className="button-link secondary" href="/dashboard/condominiums">
            Clientes
          </Link>
          <Link className="button-link secondary" href="/dashboard">
            Voltar
          </Link>
        </div>
      </header>

      {error ? <p className="form-error">Falha ao carregar financeiro dos clientes.</p> : null}

      <section className="finance-dashboard">
        <div className="metric-card">
          <span>Total de clientes</span>
          <strong>{clients.length}</strong>
        </div>
        <div className="metric-card">
          <span>Clientes ativos</span>
          <strong>{activeClients.length}</strong>
        </div>
        <div className="metric-card">
          <span>Clientes inativos</span>
          <strong>{inactiveClients.length}</strong>
        </div>
        <div className="metric-card">
          <span>Total recebido</span>
          <strong>{formatCurrency(totalPayments)}</strong>
        </div>
      </section>

      <section className="admin-section finance-chart-section">
        <h2>Pagamentos registrados por cliente</h2>
        <div className="finance-bars">
          {clients.map((client) => {
            const total = paymentTotal(client);

            return (
              <Link className="finance-bar-row" href={`/dashboard/finance/${client.id}`} key={client.id}>
                <span>{client.name}</span>
                <div aria-hidden="true">
                  <strong style={{ width: `${Math.max((total / maxPaymentTotal) * 100, total > 0 ? 8 : 0)}%` }} />
                </div>
                <small>{formatCurrency(total)}</small>
              </Link>
            );
          })}
          {!clients.length ? <p className="muted">Nenhum cliente cadastrado.</p> : null}
        </div>
      </section>

      <section className="financial-overview-grid">
        <div className="admin-section">
          <h2>Clientes ativos</h2>
          <div className="admin-list">
            {activeClients.length ? (
              activeClients.map((client) => (
                <Link className="financial-client-link financial-client-link-ok" href={`/dashboard/finance/${client.id}`} key={client.id}>
                  <strong>{client.name}</strong>
                  <span>Acesso liberado e pagamento em dia</span>
                </Link>
              ))
            ) : (
              <p className="muted">Nenhum cliente ativo encontrado.</p>
            )}
          </div>
        </div>

        <div className="admin-section finance-alert-section">
          <h2>Clientes inativos</h2>
          <div className="admin-list">
            {inactiveClients.length ? (
              inactiveClients.map((client) => (
                <Link className="financial-client-link" href={`/dashboard/finance/${client.id}`} key={client.id}>
                  <strong>{client.name}</strong>
                  <span>{statusReason(client.finance)}</span>
                </Link>
              ))
            ) : (
              <p className="muted">Nenhum cliente inativo encontrado.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
