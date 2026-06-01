import Link from "next/link";
import { registerPlateExitAction, validateInvitePlateAction, validateInviteQrAction } from "./actions";
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
    allowed: "Acesso liberado",
    cancelled: "Convite cancelado",
    expired: "Convite expirado",
    invalid: "Codigo inválido",
    not_started: "Convite fora do horario",
    usage_limit_reached: "Limite de uso atingido",
    blacklisted: "Placa bloqueada",
    parking_full: "Vagas esgotadas",
    active_stay_exists: "Permanencia ja ativa",
    exit_recorded: "Saida registrada"
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

  return (
    <main className="operator-shell">
      <header className="operator-header">
        <div>
          <p className="eyebrow">Portaria</p>
          <h1>Validar QR Code</h1>
          <p className="muted">Cole ou leia o payload do QR Code temporario apresentado pelo visitante.</p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar
        </Link>
      </header>

      {latestResult ? (
        <section className={`result-banner ${queryParams.result === "allowed" ? "success" : "danger"}`}>
          <strong>{latestResult}</strong>
          {queryParams.plate ? <span>Placa {queryParams.plate}</span> : null}
          {queryParams.invite ? <span>Convite {queryParams.invite}</span> : null}
        </section>
      ) : null}

      <section className="operator-grid">
        <div className="app-panel operator-panel">
          <h2>Leitura do convite</h2>
          <form className="auth-form" action={validateInviteQrAction}>
            <label>
              QR Code
              <input autoFocus name="qrPayload" required placeholder="convite.token" />
            </label>
            <button type="submit">Validar QR Code</button>
          </form>
        </div>

        <div className="app-panel operator-panel">
          <h2>Entrada por placa</h2>
          <form className="auth-form" action={validateInvitePlateAction}>
            <label>
              Placa
              <input name="plate" required placeholder="ABC1D23" />
            </label>
            <button type="submit">Validar placa</button>
          </form>
        </div>

        <div className="app-panel operator-panel">
          <h2>Saida por placa</h2>
          <form className="auth-form" action={registerPlateExitAction}>
            <label>
              Placa
              <input name="plate" required placeholder="ABC1D23" />
            </label>
            <button className="secondary" type="submit">Registrar saida</button>
          </form>
        </div>
      </section>

      <section className="app-panel operator-panel">
        <h2>Permanencia ativa</h2>
        <p className="muted">
          {activeStays.length} veiculo(s) em permanencia
          {totalCapacity > 0 ? ` de ${totalCapacity} vaga(s) configuradas` : ""}.
        </p>
        <div className="list-stack">
          {activeStays.map((stay) => (
            <article className="list-row" key={stay.id}>
              <div>
                <strong>{stay.plate}</strong>
                <span>
                  {stay.visitor_name} · entrada {formatDate(stay.entered_at)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="app-panel operator-panel">
        <h2>Historico recente</h2>
        {error ? <p className="form-error">Falha ao carregar validações.</p> : null}
        <div className="list-stack">
          {validations.map((validation) => (
            <article className="list-row" key={validation.id}>
              <div>
                <strong>{resultLabel(validation.result)}</strong>
                <span>
                  {validation.reason ?? "Sem observacao"} · {formatDate(validation.created_at)}
                </span>
              </div>
              {validation.invite_id ? <small>{validation.invite_id}</small> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
