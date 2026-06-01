import Link from "next/link";
import { KynoviaAdminShell } from "../../_components/KynoviaAdminShell";
import { FinanceStatusFields } from "../../condominiums/FinanceStatusFields";
import { updateCondominiumFinanceAction } from "../../condominiums/actions";
import { requireAuthorizedProfile } from "../../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

type PageParams = Promise<{ condominiumId: string }>;
type SearchParams = Promise<{ error?: string; status?: string }>;
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ClientMetadata = {
  finance?: {
    access_status?: string | null;
    billing_status?: string | null;
    blocked?: boolean | null;
    blocked_reason?: string | null;
    charge_channel?: string | null;
    last_charge_sent_at?: string | null;
    payments?: Array<{
      id?: string;
      amount?: number | null;
      notes?: string | null;
      paid_at?: string | null;
      payment_method?: string | null;
      recorded_at?: string | null;
    }>;
  } | null;
};

export const dynamic = "force-dynamic";

function asClientMetadata(metadata: Json): ClientMetadata {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as ClientMetadata)
    : {};
}

function statusMessage(status?: string) {
  if (status === "finance_updated") {
    return "Controle financeiro atualizado.";
  }

  return status ? `Operação concluída: ${status}` : null;
}

function errorMessage(error?: string) {
  const messages: Record<string, string> = {
    condominium_not_found: "Condomínio não encontrado.",
    missing_finance_fields: "Informe o status financeiro e de acesso do cliente.",
    missing_payment_fields: "Para registrar pagamento, informe data, hora, valor e forma de pagamento.",
    update_finance_failed: "Não foi possível atualizar o controle financeiro."
  };

  return error ? messages[error] ?? `Não foi possível concluir: ${error}` : null;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function paymentMethodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    bank_transfer: "Transferência bancária",
    boleto: "Boleto",
    cash: "Dinheiro",
    credit_card: "Cartão de crédito",
    other: "Outro",
    pix: "PIX"
  };

  return method ? labels[method] ?? method : "Forma não informada";
}

export default async function ClientFinancePage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const profile = await requireAuthorizedProfile();
  const { condominiumId } = await params;
  const query = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: condominium, error: condominiumError } = await supabase
    .from("condominiums")
    .select("id, tenant_id, name, metadata")
    .eq("id", condominiumId)
    .eq("tenant_id", profile.tenantId)
    .single();

  if (condominiumError || !condominium) {
    return (
      <KynoviaAdminShell
        active="finance"
        title="Financeiro não encontrado"
        description="Não foi possível localizar o cliente financeiro solicitado."
        profile={profile}
      >
        <Link className="button-link secondary" href="/dashboard/finance">
          Voltar
        </Link>
      </KynoviaAdminShell>
    );
  }

  const finance = asClientMetadata(condominium.metadata).finance ?? {};
  const payments = finance.payments ?? [];
  const isBlocked = finance.blocked === true;
  const totalPayments = payments.reduce(
    (total, payment) => total + (typeof payment.amount === "number" ? payment.amount : 0),
    0
  );
  const success = statusMessage(query.status);
  const failure = errorMessage(query.error);

  return (
    <KynoviaAdminShell
      active="finance"
      title={condominium.name}
      description="Controle financeiro, pagamentos, cobranças e bloqueio de uso do cliente."
      profile={profile}
    >
      <div className="shell-actions">
        <Link className="button-link secondary" href={`/dashboard/condominiums/${condominium.id}`}>
          Cadastro do cliente
        </Link>
        <Link className="button-link secondary" href="/dashboard/finance">
          Voltar
        </Link>
      </div>
      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}

      <section className="finance-detail-hero">
        <div className={isBlocked ? "finance-status-card blocked" : "finance-status-card"}>
          <span>Status de acesso</span>
          <strong>{isBlocked ? "Inativo" : "Ativo"}</strong>
          <small>{isBlocked ? finance.blocked_reason ?? "Cliente com restrição de uso." : "Cliente liberado para uso do sistema."}</small>
        </div>
        <div className="finance-status-card">
          <span>Status do pagamento</span>
          <strong>{finance.billing_status === "overdue" ? "Atrasado" : "Em dia"}</strong>
          <small>{finance.billing_status === "overdue" ? "Acompanhar cobrança e bloqueio." : "Sem atraso financeiro registrado."}</small>
        </div>
        <div className="finance-status-card amount">
          <span>Total recebido</span>
          <strong>{formatCurrency(totalPayments)}</strong>
          <small>{payments.length} pagamento(s) registrado(s)</small>
        </div>
      </section>

      <section className="finance-detail-layout">
        <div className="admin-section finance-control-panel">
          <div className="finance-section-heading">
            <div>
              <h2>Controle financeiro</h2>
              <p className="muted">Status, cobrança e registro de pagamento em uma rotina única.</p>
            </div>
          </div>
          <form className="admin-form" action={updateCondominiumFinanceAction}>
            <input name="condominium_id" type="hidden" value={condominium.id} />
            <FinanceStatusFields
              accessStatus={finance.access_status}
              billingStatus={finance.billing_status}
              blockedReason={finance.blocked_reason}
              isBlocked={isBlocked}
            />
            <div className="form-row payment-row">
              <label>
                Data do pagamento
                <input name="payment_date" type="date" />
              </label>
              <label>
                Hora
                <input name="payment_time" type="time" />
              </label>
              <label>
                Valor
                <input name="payment_amount" inputMode="decimal" placeholder="0,00" />
              </label>
            </div>
            <div className="form-row finance-status-row">
              <label>
                Forma de pagamento
                <select name="payment_method" defaultValue="">
                  <option value="">Não registrar pagamento agora</option>
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto</option>
                  <option value="credit_card">Cartão de crédito</option>
                  <option value="bank_transfer">Transferência bancária</option>
                  <option value="cash">Dinheiro</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <label>
                Envio de cobrança
                <select name="charge_channel" defaultValue={finance.charge_channel ?? ""}>
                  <option value="">Não enviar agora</option>
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email_whatsapp">E-mail e WhatsApp</option>
                </select>
              </label>
            </div>
            <label>
              Observações financeiras
              <input name="payment_notes" placeholder="Referência, vencimento ou detalhe do pagamento" />
            </label>
            <button type="submit">Salvar controle financeiro</button>
          </form>
        </div>

        <aside className="admin-section finance-history-panel">
          <div className="finance-section-heading">
            <div>
              <h2>Pagamentos</h2>
              <p className="muted">Últimos registros do cliente.</p>
            </div>
          </div>
          <div className="finance-payment-list">
            {payments.slice(0, 10).map((payment) => (
              <div className="finance-payment-item" key={payment.id ?? payment.paid_at ?? "payment"}>
                <strong>
                  {typeof payment.amount === "number" ? formatCurrency(payment.amount) : "Valor não informado"}
                </strong>
                <span>{paymentMethodLabel(payment.payment_method)}</span>
                <small>{payment.paid_at ? new Date(payment.paid_at).toLocaleString("pt-BR") : "Sem data"}</small>
                {payment.notes ? <small>{payment.notes}</small> : null}
              </div>
            ))}
            {!payments.length ? (
              <div className="finance-empty-state compact">
                <h3>Nenhum pagamento registrado</h3>
                <p>Use o formulário ao lado para registrar o primeiro pagamento deste cliente.</p>
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </KynoviaAdminShell>
  );
}
