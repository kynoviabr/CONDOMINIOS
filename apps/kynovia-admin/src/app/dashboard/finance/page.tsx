import Link from "next/link";
import { KynoviaAdminShell } from "../_components/KynoviaAdminShell";
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

function financeStatus(client: ClientFinanceSummary) {
  if (isInactiveClient(client.finance)) {
    return {
      label: client.finance.billing_status === "overdue" ? "Atrasado" : "Inativo",
      tone: "danger"
    };
  }

  return {
    label: "Em dia",
    tone: "success"
  };
}

function paymentTotal(client: ClientFinanceSummary) {
  return (client.finance.payments ?? []).reduce(
    (total, payment) => total + (typeof payment.amount === "number" ? payment.amount : 0),
    0
  );
}

function lastPaymentDate(client: ClientFinanceSummary) {
  const dates = (client.finance.payments ?? [])
    .map((payment) => (payment.paid_at ? new Date(payment.paid_at) : null))
    .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()))
    .sort((current, next) => next.getTime() - current.getTime());

  return dates[0]?.toLocaleDateString("pt-BR") ?? "Sem registro";
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
    <KynoviaAdminShell
      active="finance"
      title="Financeiro dos clientes"
      description="Gestão financeira centralizada, pagamentos, inadimplência e bloqueio de uso dos clientes."
      profile={profile}
    >
      {error ? <p className="form-error">Falha ao carregar financeiro dos clientes.</p> : null}

      <section className="finance-command-center">
        <div className="finance-stat primary">
          <span>Total recebido</span>
          <strong>{formatCurrency(totalPayments)}</strong>
        </div>
        <div className="finance-stat">
          <span>Clientes</span>
          <strong>{clients.length}</strong>
        </div>
        <div className="finance-stat">
          <span>Em dia</span>
          <strong>{activeClients.length}</strong>
        </div>
        <div className="finance-stat alert">
          <span>Atenção</span>
          <strong>{inactiveClients.length}</strong>
        </div>
      </section>

      <section className="finance-workspace">
        <div className="finance-workspace-header">
          <div>
            <h2>Carteira financeira</h2>
            <p className="muted">Visão operacional dos clientes, recebimentos e pendências.</p>
          </div>
          <Link className="button-link secondary" href="/dashboard/condominiums">
            Gestão de clientes
          </Link>
        </div>

        <div className="finance-table">
          <div className="finance-table-head" aria-hidden="true">
            <span>Cliente</span>
            <span>Status</span>
            <span>Último pagamento</span>
            <span>Total recebido</span>
            <span>Ação</span>
          </div>
          {clients.map((client) => {
            const total = paymentTotal(client);
            const status = financeStatus(client);

            return (
              <Link className="finance-table-row" href={`/dashboard/finance/${client.id}`} key={client.id}>
                <span className="finance-client-cell">
                  <span>{client.name}</span>
                  <small>{isInactiveClient(client.finance) ? statusReason(client.finance) : "Acesso liberado"}</small>
                </span>
                <span className={`status-pill ${status.tone}`}>{status.label}</span>
                <span>{lastPaymentDate(client)}</span>
                <span className="finance-amount-cell">
                  <span>{formatCurrency(total)}</span>
                  <small aria-hidden="true">
                    <i style={{ width: `${Math.max((total / maxPaymentTotal) * 100, total > 0 ? 8 : 0)}%` }} />
                  </small>
                </span>
                <span className="finance-action-cell">Abrir</span>
              </Link>
            );
          })}
          {!clients.length ? (
            <div className="finance-empty-state">
              <h3>Nenhum cliente cadastrado</h3>
              <p>Cadastre um cliente para iniciar o acompanhamento financeiro.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="finance-attention-strip">
        <div>
          <span>Pendências</span>
          <strong>{inactiveClients.length ? `${inactiveClients.length} cliente(s) precisam de atenção` : "Nenhuma pendência crítica"}</strong>
        </div>
        <p>
          {inactiveClients.length
            ? "Priorize clientes com pagamento atrasado ou acesso inativo para reduzir retrabalho operacional."
            : "A carteira está sem bloqueios ou atrasos registrados no momento."}
        </p>
      </section>
    </KynoviaAdminShell>
  );
}
