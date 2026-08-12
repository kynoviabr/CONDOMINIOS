import Link from "next/link";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { AutoRefresh } from "./auto-refresh";
import { createOccurrenceAction, recordManualAccessAction, resolvePendingAccessAction } from "./actions";

type SearchParams = Promise<{
  q?: string;
  status?: string;
}>;

type AccessPoint = {
  id: string;
  name: string;
  kind: string;
};

type AccessEvent = {
  id: string;
  access_point_id: string | null;
  plate: string | null;
  direction: string;
  decision: string;
  reason: string | null;
  decided_at: string;
  metadata: unknown;
};

type ExpectedInvite = {
  id: string;
  visitor_name: string;
  visitor_phone: string | null;
  plate: string | null;
  unit_id: string | null;
  starts_at: string;
  expires_at: string;
  status: string;
  use_count: number;
  max_uses: number;
};

type GateCommand = {
  id: string;
  access_point_id: string;
  command: string;
  status: string;
  requested_at: string;
};

type Occurrence = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  created_at: string;
};

type ActiveStay = {
  id: string;
  plate: string;
  visitor_name: string;
  entered_at: string;
};

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

function metadataText(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function decisionLabel(value: string) {
  const labels: Record<string, string> = {
    allow: "Liberado",
    deny: "Negado",
    manual_review: "Pendente validação"
  };

  return labels[value] ?? value;
}

function statusLabel(value: string | undefined) {
  const labels: Record<string, string> = {
    invalid: "Registro inválido ou incompleto.",
    manual_allowed: "Liberacao manual registrada.",
    manual_denied: "Negacao de acesso registrada.",
    occurrence_created: "Ocorrencia registrada.",
    pending_updated: "Evento pendente atualizado."
  };

  return value ? labels[value] ?? null : null;
}

function matchesSearch(needle: string, values: Array<string | null | undefined>) {
  if (!needle) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(needle));
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireAuthorizedProfile();
  const queryParams = await searchParams;
  const query = (queryParams.q ?? "").trim().toLowerCase();
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    { data: accessPointsData },
    { data: eventsData },
    { data: pendingEventsData },
    { data: expectedInvitesData },
    { data: gateCommandsData },
    { data: occurrencesData },
    { data: activeStaysData }
  ] = await Promise.all([
    supabase.from("access_points").select("id, name, kind").order("name", { ascending: true }),
    supabase
      .from("access_events")
      .select("id, access_point_id, plate, direction, decision, reason, decided_at, metadata")
      .order("decided_at", { ascending: false })
      .limit(50),
    supabase
      .from("access_events")
      .select("id, access_point_id, plate, direction, decision, reason, decided_at, metadata")
      .eq("decision", "manual_review")
      .order("decided_at", { ascending: false })
      .limit(12),
    supabase
      .from("access_invites")
      .select("id, visitor_name, visitor_phone, plate, unit_id, starts_at, expires_at, status, use_count, max_uses")
      .eq("status", "active")
      .lte("starts_at", todayEnd.toISOString())
      .gte("expires_at", todayStart.toISOString())
      .order("starts_at", { ascending: true })
      .limit(40),
    supabase
      .from("gate_commands")
      .select("id, access_point_id, command, status, requested_at")
      .order("requested_at", { ascending: false })
      .limit(80),
    supabase
      .from("gatehouse_occurrences")
      .select("id, title, description, severity, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("visitor_vehicle_accesses")
      .select("id, plate, visitor_name, entered_at")
      .eq("status", "active")
      .order("entered_at", { ascending: false })
      .limit(30)
  ]);

  const accessPoints = (accessPointsData ?? []) as AccessPoint[];
  const accessPointById = new Map(accessPoints.map((point) => [point.id, point]));
  const events = ((eventsData ?? []) as AccessEvent[]).filter((event) =>
    matchesSearch(query, [
      event.plate,
      event.reason,
      metadataText(event.metadata, "visitorName"),
      metadataText(event.metadata, "unitReference"),
      accessPointById.get(event.access_point_id ?? "")?.name
    ])
  );
  const pendingEvents = ((pendingEventsData ?? []) as AccessEvent[]).filter((event) =>
    matchesSearch(query, [
      event.plate,
      event.reason,
      metadataText(event.metadata, "visitorName"),
      metadataText(event.metadata, "unitReference"),
      accessPointById.get(event.access_point_id ?? "")?.name
    ])
  );
  const expectedInvites = ((expectedInvitesData ?? []) as ExpectedInvite[]).filter((invite) =>
    matchesSearch(query, [invite.visitor_name, invite.visitor_phone, invite.plate, invite.unit_id])
  );
  const gateCommands = (gateCommandsData ?? []) as GateCommand[];
  const latestCommandByAccessPoint = new Map<string, GateCommand>();

  for (const command of gateCommands) {
    if (!latestCommandByAccessPoint.has(command.access_point_id)) {
      latestCommandByAccessPoint.set(command.access_point_id, command);
    }
  }

  const occurrences = (occurrencesData ?? []) as Occurrence[];
  const activeStays = (activeStaysData ?? []) as ActiveStay[];
  const entriesToday = events.filter(
    (event) =>
      event.direction === "entry" &&
      event.decision === "allow" &&
      new Date(event.decided_at).getTime() >= todayStart.getTime()
  ).length;
  const exitsToday = events.filter(
    (event) =>
      event.direction === "exit" &&
      event.decision === "allow" &&
      new Date(event.decided_at).getTime() >= todayStart.getTime()
  ).length;
  const deniedToday = events.filter(
    (event) => event.decision === "deny" && new Date(event.decided_at).getTime() >= todayStart.getTime()
  ).length;
  const banner = statusLabel(queryParams.status);

  return (
    <main className="operator-shell wide">
        <header className="operator-header">
          <div>
            <p className="eyebrow">Central de operação</p>
            <h1>Painel da Portaria</h1>
            <p className="muted">
              Fila operacional, validação rápida, visitantes esperados, ocorrências e status dos portões.
            </p>
          </div>
          <div className="header-actions">
            <AutoRefresh />
          </div>
        </header>

      {banner ? <section className="result-banner success">{banner}</section> : null}

      <section className="metric-grid">
        <article className="metric-card">
          <span>Entradas hoje</span>
          <strong>{entriesToday}</strong>
        </article>
        <article className="metric-card">
          <span>Saidas hoje</span>
          <strong>{exitsToday}</strong>
        </article>
        <article className="metric-card danger">
          <span>Acessos negados</span>
          <strong>{deniedToday}</strong>
        </article>
        <article className="metric-card warning">
          <span>Pendentes</span>
          <strong>{pendingEvents.length}</strong>
        </article>
        <article className="metric-card">
          <span>Veiculos no patio</span>
          <strong>{activeStays.length}</strong>
        </article>
        <article className="metric-card warning">
          <span>Ocorrencias abertas</span>
          <strong>{occurrences.length}</strong>
        </article>
      </section>

      <section className="app-panel operator-panel search-panel">
        <form className="toolbar-form">
          <label>
            Busca operacional
            <input
              defaultValue={queryParams.q}
              name="q"
              placeholder="Nome, placa, unidade, telefone ou ponto de acesso"
            />
          </label>
          <button type="submit">Buscar</button>
          {query ? (
            <Link className="button-link secondary" href="/dashboard">
              Limpar
            </Link>
          ) : null}
        </form>
      </section>

      <section className="operator-layout">
        <div className="primary-column">
          <section className="app-panel operator-panel">
            <h2>Fila de acessos</h2>
            <div className="table-list">
              {events.slice(0, 15).map((event) => (
                <article className="event-row" key={event.id}>
                  <span className={`status-badge ${event.decision}`}>{decisionLabel(event.decision)}</span>
                  <div>
                    <strong>
                      {metadataText(event.metadata, "visitorName") ?? event.plate ?? "Acesso operacional"}
                    </strong>
                    <span>
                      {event.direction === "entry" ? "Entrada" : "Saida"} ·{" "}
                      {accessPointById.get(event.access_point_id ?? "")?.name ?? "Ponto não informado"} ·{" "}
                      {formatDate(event.decided_at)}
                    </span>
                  </div>
                  <small>{event.reason ?? metadataText(event.metadata, "unitReference") ?? "Sem observacao"}</small>
                </article>
              ))}
              {events.length === 0 ? <p className="muted compact">Nenhum evento encontrado.</p> : null}
            </div>
          </section>

          <section className="app-panel operator-panel">
            <h2>Eventos pendentes</h2>
            <div className="list-stack">
              {pendingEvents.map((event) => (
                <article className="list-row pending-row" key={event.id}>
                  <div>
                    <strong>{metadataText(event.metadata, "visitorName") ?? event.plate ?? "Revisão manual"}</strong>
                    <span>
                      {event.reason ?? "Aguardando decisao da portaria"} · {formatDate(event.decided_at)}
                    </span>
                  </div>
                  <div className="inline-actions">
                    <form action={resolvePendingAccessAction}>
                      <input name="eventId" type="hidden" value={event.id} />
                      <button name="decision" type="submit" value="allow">
                        Liberar
                      </button>
                    </form>
                    <form action={resolvePendingAccessAction}>
                      <input name="eventId" type="hidden" value={event.id} />
                      <button className="danger-button" name="decision" type="submit" value="deny">
                        Negar
                      </button>
                    </form>
                  </div>
                </article>
              ))}
              {pendingEvents.length === 0 ? <p className="muted compact">Sem eventos pendentes.</p> : null}
            </div>
          </section>

          <section className="app-panel operator-panel">
            <h2>Visitantes esperados hoje</h2>
            <div className="table-list">
              {expectedInvites.map((invite) => (
                <article className="event-row" key={invite.id}>
                  <span className="status-badge allow">{invite.use_count}/{invite.max_uses}</span>
                  <div>
                    <strong>{invite.visitor_name}</strong>
                    <span>
                      {invite.plate ?? "Sem placa"} · {invite.visitor_phone ?? "Sem telefone"} ·{" "}
                      {formatDate(invite.starts_at)}
                    </span>
                  </div>
                  <small>{invite.unit_id ?? "Unidade não informada"}</small>
                </article>
              ))}
              {expectedInvites.length === 0 ? <p className="muted compact">Nenhum visitante esperado no filtro atual.</p> : null}
            </div>
          </section>
        </div>

        <aside className="side-column">
          <section className="app-panel operator-panel">
            <h2>Liberacao rapida</h2>
            <form className="auth-form" action={recordManualAccessAction}>
              <label>
                Nome ou identificacao
                <input name="visitorName" placeholder="Visitante, entrega ou colaborador" />
              </label>
              <label>
                Placa
                <input name="plate" placeholder="ABC1D23" />
              </label>
              <label>
                Unidade ou destino
                <input name="unitReference" placeholder="Bloco A / 101" />
              </label>
              <label>
                Sentido
                <select name="direction" defaultValue="entry">
                  <option value="entry">Entrada</option>
                  <option value="exit">Saida</option>
                </select>
              </label>
              <label>
                Ponto de acesso
                <select name="accessPointId" defaultValue="">
                  <option value="">Não acionar portao</option>
                  {accessPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Observacao
                <input name="reason" placeholder="Motivo da liberacao ou negacao" />
              </label>
              <div className="split-actions">
                <button name="decision" type="submit" value="allow">
                  Liberar acesso
                </button>
                <button className="danger-button" name="decision" type="submit" value="deny">
                  Negar
                </button>
              </div>
            </form>
          </section>

          <section className="app-panel operator-panel">
            <h2>Status dos portoes</h2>
            <div className="list-stack">
              {accessPoints.map((point) => {
                const command = latestCommandByAccessPoint.get(point.id);

                return (
                  <article className="list-row" key={point.id}>
                    <div>
                      <strong>{point.name}</strong>
                      <span>{point.kind}</span>
                    </div>
                    <small>{command ? `${command.command} · ${command.status}` : "Sem comando recente"}</small>
                  </article>
                );
              })}
              {accessPoints.length === 0 ? <p className="muted compact">Nenhum ponto de acesso cadastrado.</p> : null}
            </div>
          </section>

          <section className="app-panel operator-panel">
            <h2>Registrar ocorrência</h2>
            <form className="auth-form" action={createOccurrenceAction}>
              <label>
                Titulo
                <input name="title" required placeholder="Ex.: visitante aguardando autorizacao" />
              </label>
              <label>
                Severidade
                <select name="severity" defaultValue="medium">
                  <option value="low">Baixa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="critical">Critica</option>
                </select>
              </label>
              <label>
                Descricao
                <input name="description" placeholder="Contexto operacional" />
              </label>
              <button type="submit">Registrar ocorrência</button>
            </form>
          </section>

          <section className="app-panel operator-panel">
            <h2>Ocorrencias abertas</h2>
            <div className="list-stack">
              {occurrences.map((occurrence) => (
                <article className="list-row" key={occurrence.id}>
                  <div>
                    <strong>{occurrence.title}</strong>
                    <span>
                      {occurrence.severity} · {formatDate(occurrence.created_at)}
                    </span>
                  </div>
                </article>
              ))}
              {occurrences.length === 0 ? <p className="muted compact">Sem ocorrências abertas.</p> : null}
            </div>
          </section>
        </aside>
      </section>

      <footer className="operator-footer">
        <span>{profile.fullName}</span>
        <span>{profile.role}</span>
        <span>{profile.tenantId}</span>
      </footer>
    </main>
  );
}
