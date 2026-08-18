import Link from "next/link";
import { registerPlateExitAction, validateInvitePlateAction, validateInviteQrAction } from "./actions";
import { QrCameraScanner } from "./QrCameraScanner";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{
  invite?: string;
  plate?: string;
  result?: string;
}>;

type InviteValidation = {
  created_at: string;
  id: string;
  invite_id: string | null;
  reason: string | null;
  result: string;
};

type ActiveStay = {
  entered_at: string;
  id: string;
  plate: string;
  visitor_name: string;
};

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

function resultLabel(value: string | undefined) {
  const labels: Record<string, string> = {
    active_stay_exists: "Permanência já ativa no condomínio",
    allowed: "Acesso Liberado com Sucesso",
    blacklisted: "Acesso Negado: Placa Bloqueada na Blacklist",
    cancelled: "Convite Cancelado pelo Morador",
    exit_recorded: "Saída Registrada com Sucesso",
    expired: "Convite Expirado",
    invalid: "Código de Convite / QR Code Inválido",
    not_started: "Convite Fora do Horário Permitido",
    parking_full: "Vagas de Visitantes Esgotadas",
    usage_limit_reached: "Limite de Utilizações do Convite Atingido"
  };

  return value ? labels[value] ?? value : null;
}

export default async function InviteValidationPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthorizedProfile();
  const queryParams = await searchParams;
  const supabase = await createServerSupabaseClient();
  const [
    { data: validationsData, error },
    { data: activeStaysData },
    { data: condominiumsData }
  ] = await Promise.all([
    supabase
      .from("access_invite_validations")
      .select("id, invite_id, result, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("visitor_vehicle_accesses")
      .select("id, plate, visitor_name, entered_at")
      .eq("status", "active")
      .order("entered_at", { ascending: false })
      .limit(25),
    supabase.from("condominiums").select("id, visitor_parking_capacity")
  ]);

  const validations = (validationsData ?? []) as InviteValidation[];
  const activeStays = (activeStaysData ?? []) as ActiveStay[];
  const totalCapacity = (condominiumsData ?? []).reduce(
    (sum, condominium) => sum + (condominium.visitor_parking_capacity ?? 0),
    0
  );
  const latestResult = resultLabel(queryParams.result);
  const isSuccess = queryParams.result === "allowed" || queryParams.result === "exit_recorded";

  return (
    <main className="operator-shell">
      <header className="operator-header">
        <div>
          <p className="eyebrow">Portaria</p>
          <h1>Validação de Convites & QR Code</h1>
          <p className="muted">
            Leitura via câmera, leitor de código de barras ou validação de placa de veículos.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar ao Painel
        </Link>
      </header>

      {latestResult ? (
        <section
          className={`result-banner ${isSuccess ? "success" : "danger"}`}
          style={{
            borderRadius: "8px",
            fontSize: "1.05rem",
            marginBottom: "20px",
            padding: "16px"
          }}
        >
          <strong>{latestResult}</strong>
          {queryParams.plate ? <div style={{ fontSize: "0.9rem", marginTop: "4px" }}>Placa: <strong>{queryParams.plate}</strong></div> : null}
          {queryParams.invite ? <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>Código do convite: {queryParams.invite}</div> : null}
        </section>
      ) : null}

      <section className="operator-grid">
        {/* Leitura e Câmera de QR Code */}
        <div className="app-panel operator-panel" style={{ gridColumn: "span 2" }}>
          <h2>1. Leitura de QR Code (Câmera ou Leitor Óptico)</h2>
          <p className="muted" style={{ marginBottom: "12px" }}>
            Aponte a câmera para o QR Code do smartphone do visitante ou use o leitor de código de barras.
          </p>
          <QrCameraScanner onScanAction={validateInviteQrAction} />
        </div>

        {/* Entrada por Placa */}
        <div className="app-panel operator-panel">
          <h2>2. Entrada por Placa</h2>
          <form action={validateInvitePlateAction} className="auth-form">
            <label>
              Placa do Veículo
              <input name="plate" placeholder="Ex: ABC1D23" required />
            </label>
            <button style={{ minHeight: "44px" }} type="submit">
              🚗 Liberar Entrada
            </button>
          </form>
        </div>

        {/* Saída por Placa */}
        <div className="app-panel operator-panel">
          <h2>3. Saída de Visitante</h2>
          <form action={registerPlateExitAction} className="auth-form">
            <label>
              Placa do Veículo Saindo
              <input name="plate" placeholder="Ex: ABC1D23" required />
            </label>
            <button className="secondary" style={{ minHeight: "44px" }} type="submit">
              🚪 Registrar Saída
            </button>
          </form>
        </div>
      </section>

      {/* Permanência Ativa no Condomínio */}
      <section className="app-panel operator-panel" style={{ marginTop: "24px" }}>
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
          <h2>Veículos em Permanência Ativa ({activeStays.length})</h2>
          <span className="status-badge active">
            {totalCapacity > 0
              ? `${activeStays.length} / ${totalCapacity} vagas ocupadas`
              : `${activeStays.length} veículo(s) no condomínio`}
          </span>
        </div>
        <p className="muted">Visitantes e prestadores que entraram e ainda não registraram saída.</p>

        {activeStays.length === 0 ? (
          <p className="muted compact">Nenhum veículo visitante no condomínio neste momento.</p>
        ) : (
          <div className="list-stack">
            {activeStays.map((stay) => (
              <article className="list-row" key={stay.id}>
                <div>
                  <strong>🚗 Placa: {stay.plate}</strong>
                  <span>
                    {stay.visitor_name} · Entrada registrada em {formatDate(stay.entered_at)}
                  </span>
                </div>
                <form action={registerPlateExitAction}>
                  <input name="plate" type="hidden" value={stay.plate} />
                  <button className="secondary compact-button" type="submit">
                    Dar Saída
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Histórico Recente de Validações */}
      <section className="app-panel operator-panel" style={{ marginTop: "24px" }}>
        <h2>Histórico Recente de Validações</h2>
        {error ? <p className="form-error">Falha ao carregar validações.</p> : null}
        <div className="list-stack">
          {validations.map((validation) => {
            const isValAllowed = validation.result === "allowed";
            return (
              <article className="list-row" key={validation.id}>
                <div>
                  <span
                    className={`status-badge ${isValAllowed ? "active" : "destructive"}`}
                    style={{ marginRight: "8px" }}
                  >
                    {resultLabel(validation.result)}
                  </span>
                  <span>
                    {validation.reason ?? "Sem observação"} · {formatDate(validation.created_at)}
                  </span>
                </div>
                {validation.invite_id ? (
                  <small style={{ color: "#64748b", fontFamily: "monospace" }}>
                    ID: {validation.invite_id.slice(0, 8)}...
                  </small>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
