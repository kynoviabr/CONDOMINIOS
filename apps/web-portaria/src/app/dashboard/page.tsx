import {
  supplierCategoryLabels
} from "@kynovia/database";
import type { SupplierCategory } from "@kynovia/database";
import Link from "next/link";
import {
  createOccurrenceAction,
  recordManualAccessAction,
  registerSupplierAccessAction,
  requestResidentApprovalAction,
  resolvePendingAccessAction,
  triggerGateCommandAction
} from "./actions";
import { AutoRefresh } from "./auto-refresh";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { createServerSupabaseClient } from "../../lib/supabase/server";

type SearchParams = Promise<{
  q?: string;
  status?: string;
}>;

type AccessPoint = {
  id: string;
  kind: string;
  name: string;
};

type AccessEvent = {
  access_point_id: string | null;
  decided_at: string;
  decision: string;
  direction: string;
  id: string;
  metadata: unknown;
  plate: string | null;
  reason: string | null;
};

type ExpectedInvite = {
  expires_at: string;
  id: string;
  max_uses: number;
  plate: string | null;
  starts_at: string;
  status: string;
  unit_id: string | null;
  use_count: number;
  visitor_name: string;
  visitor_phone: string | null;
};

type GateCommand = {
  access_point_id: string;
  command: string;
  id: string;
  requested_at: string;
  status: string;
};

type Occurrence = {
  created_at: string;
  description: string | null;
  id: string;
  severity: string;
  status: string;
  title: string;
};

type ActiveStay = {
  entered_at: string;
  id: string;
  plate: string;
  visitor_name: string;
};

type ResidentApproval = {
  created_at: string;
  expires_at: string;
  id: string;
  notes: string | null;
  plate: string | null;
  status: string;
  unit_id: string | null;
  visitor_name: string;
  visitor_phone: string | null;
};

type ResidentOption = {
  full_name: string;
  id: string;
};

type UnitOption = {
  block: string | null;
  floor: string | null;
  id: string;
  number: string;
};

type Supplier = {
  allowed_time_end: string;
  allowed_time_start: string;
  allowed_weekdays: number[];
  category: SupplierCategory;
  id: string;
  name: string;
  status: string;
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
    approval_requested: "Solicitação de aprovação enviada ao morador com sucesso.",
    gate_opened: "Comando de abertura do portão enviado com sucesso.",
    invalid: "Registro inválido ou campos incompletos.",
    manual_allowed: "Liberação manual registrada com sucesso.",
    manual_denied: "Negação de acesso registrada com sucesso.",
    occurrence_created: "Ocorrência registrada no livro da portaria.",
    pending_updated: "Evento pendente atualizado.",
    supplier_access_recorded: "Entrada/Saída de prestador registrada com sucesso."
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
    { data: activeStaysData },
    { data: approvalsData },
    { data: unitsData },
    { data: residentsData },
    { data: suppliersData }
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
      .limit(30),
    supabase
      .from("resident_access_approvals")
      .select("id, unit_id, visitor_name, visitor_phone, plate, notes, status, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("units").select("id, block, number, floor").order("number", { ascending: true }),
    supabase.from("residents").select("id, full_name").eq("status", "active").order("full_name", { ascending: true }),
    supabase.from("suppliers").select("id, name, category, status, allowed_weekdays, allowed_time_start, allowed_time_end").eq("status", "active").order("name", { ascending: true })
  ]);

  const accessPoints = (accessPointsData ?? []) as AccessPoint[];
  const accessPointById = new Map(accessPoints.map((point) => [point.id, point]));
  const units = (unitsData ?? []) as UnitOption[];
  const unitsById = new Map(units.map((u) => [u.id, u]));
  const residents = (residentsData ?? []) as ResidentOption[];
  const suppliers = (suppliersData ?? []) as Supplier[];
  const approvals = (approvalsData ?? []) as ResidentApproval[];

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
          <p className="eyebrow">Central de Operação</p>
          <h1>Painel da Portaria</h1>
          <p className="muted">
            Acionamento de portões, validação de QR Code, solicitações ao morador e controle de prestadores.
          </p>
        </div>
        <div className="header-actions" style={{ display: "flex", gap: "10px" }}>
          <Link className="button-link" href="/dashboard/invites" style={{ background: "#0284c7", borderColor: "#0284c7" }}>
            📷 Validar QR Code
          </Link>
          <AutoRefresh />
        </div>
      </header>

      {banner ? <section className="result-banner success">{banner}</section> : null}

      {/* Barra de Acionamento Rápido de Portões e Cancelas */}
      <section className="app-panel operator-panel" style={{ background: "#0f172a", color: "#f8fafc" }}>
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", justifyContent: "space-between", marginBottom: "12px" }}>
          <h2 style={{ color: "#f8fafc", margin: 0 }}>⚡ Acionamento Rápido de Portões & Cancelas</h2>
          <span className="status-badge" style={{ background: "#1e293b", color: "#38bdf8" }}>
            {accessPoints.length} Ponto(s) Conectado(s)
          </span>
        </div>
        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {accessPoints.map((point) => (
            <form action={triggerGateCommandAction} key={point.id} style={{ margin: 0 }}>
              <input name="accessPointId" type="hidden" value={point.id} />
              <input name="command" type="hidden" value="open" />
              <button
                style={{
                  background: "#2563eb",
                  borderColor: "#3b82f6",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  minHeight: "48px",
                  width: "100%"
                }}
                type="submit"
              >
                🔓 Abrir {point.name}
              </button>
            </form>
          ))}
          {accessPoints.length === 0 ? (
            <p className="muted compact" style={{ color: "#94a3b8" }}>Nenhum ponto de acesso cadastrado.</p>
          ) : null}
        </div>
      </section>

      {/* Grid de Métricas */}
      <section className="metric-grid" style={{ marginTop: "16px" }}>
        <article className="metric-card">
          <span>Entradas hoje</span>
          <strong>{entriesToday}</strong>
        </article>
        <article className="metric-card">
          <span>Saídas hoje</span>
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
          <span>Veículos no pátio</span>
          <strong>{activeStays.length}</strong>
        </article>
        <article className="metric-card warning">
          <span>Ocorrências abertas</span>
          <strong>{occurrences.length}</strong>
        </article>
      </section>

      {/* Barra de Busca */}
      <section className="app-panel operator-panel search-panel" style={{ marginTop: "16px" }}>
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

      <section className="operator-layout" style={{ marginTop: "16px" }}>
        <div className="primary-column">
          {/* Fila de Aprovações em Tempo Real do Morador */}
          <section className="app-panel operator-panel">
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
              <h2>Aprovações Despachadas aos Moradores</h2>
              <span className="status-badge active">{approvals.length} Recente(s)</span>
            </div>
            <div className="list-stack">
              {approvals.map((approval) => {
                const unit = approval.unit_id ? unitsById.get(approval.unit_id) : null;
                const unitLabel = unit ? `${unit.block ? `Bloco ${unit.block} / ` : ""}Unidade ${unit.number}` : "Unidade";
                const isPending = approval.status === "pending";

                return (
                  <article className="list-row" key={approval.id}>
                    <div>
                      <strong>{approval.visitor_name}</strong>
                      <span style={{ display: "block", fontSize: "0.85rem", marginTop: "2px" }}>
                        Destino: <strong>{unitLabel}</strong> · Placa: {approval.plate ?? "sem placa"} · Tel: {approval.visitor_phone ?? "sem fone"}
                      </span>
                      {approval.notes ? <small className="muted">{approval.notes}</small> : null}
                    </div>
                    <span
                      className={`status-badge ${
                        approval.status === "approved"
                          ? "active"
                          : isPending
                          ? "inactive"
                          : "destructive"
                      }`}
                    >
                      {approval.status === "approved"
                        ? "✅ Aprovado"
                        : isPending
                        ? "⏳ Aguardando Morador"
                        : "❌ Recusado"}
                    </span>
                  </article>
                );
              })}
              {approvals.length === 0 ? <p className="muted compact">Nenhuma solicitação recente ao morador.</p> : null}
            </div>
          </section>

          {/* Fila de Acessos Recentes */}
          <section className="app-panel operator-panel">
            <h2>Fila de Acessos Recentes</h2>
            <div className="table-list">
              {events.slice(0, 15).map((event) => (
                <article className="event-row" key={event.id}>
                  <span className={`status-badge ${event.decision}`}>{decisionLabel(event.decision)}</span>
                  <div>
                    <strong>
                      {metadataText(event.metadata, "visitorName") ?? event.plate ?? "Acesso operacional"}
                    </strong>
                    <span>
                      {event.direction === "entry" ? "Entrada" : "Saída"} ·{" "}
                      {accessPointById.get(event.access_point_id ?? "")?.name ?? "Ponto não informado"} ·{" "}
                      {formatDate(event.decided_at)}
                    </span>
                  </div>
                  <small>{event.reason ?? metadataText(event.metadata, "unitReference") ?? "Sem observação"}</small>
                </article>
              ))}
              {events.length === 0 ? <p className="muted compact">Nenhum evento encontrado.</p> : null}
            </div>
          </section>

          {/* Eventos Pendentes */}
          <section className="app-panel operator-panel">
            <h2>Eventos Pendentes de Revisão</h2>
            <div className="list-stack">
              {pendingEvents.map((event) => (
                <article className="list-row pending-row" key={event.id}>
                  <div>
                    <strong>{metadataText(event.metadata, "visitorName") ?? event.plate ?? "Revisão manual"}</strong>
                    <span>
                      {event.reason ?? "Aguardando decisão da portaria"} · {formatDate(event.decided_at)}
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
              {pendingEvents.length === 0 ? <p className="muted compact">Sem eventos pendentes de revisão.</p> : null}
            </div>
          </section>

          {/* Visitantes Esperados Hoje */}
          <section className="app-panel operator-panel">
            <h2>Visitantes Esperados Hoje</h2>
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
                  <small>{invite.unit_id ? unitsById.get(invite.unit_id)?.number ?? "Unidade" : "Unidade não informada"}</small>
                </article>
              ))}
              {expectedInvites.length === 0 ? <p className="muted compact">Nenhum visitante esperado no filtro atual.</p> : null}
            </div>
          </section>
        </div>

        <aside className="side-column">
          {/* Solicitar Entrada ao Morador (PWA) */}
          <section className="app-panel operator-panel" style={{ border: "2px solid #0284c7" }}>
            <h2 style={{ color: "#0284c7" }}>📲 Solicitar Entrada ao Morador</h2>
            <p className="muted compact">Dispara notificação instantânea para o smartphone do morador aprovar.</p>
            <form action={requestResidentApprovalAction} className="auth-form" style={{ marginTop: "10px" }}>
              <label>
                Unidade de Destino *
                <select name="unitId" required>
                  <option value="">Selecione a Unidade</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.block ? `Bloco ${u.block} - ` : ""}Unidade {u.number}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Morador Responsável *
                <select name="residentId" required>
                  <option value="">Selecione o Morador</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Nome do Visitante / Entregador *
                <input name="visitorName" placeholder="Ex: Carlos (Entrega Mercado Livre)" required />
              </label>

              <label>
                Placa (se houver)
                <input name="plate" placeholder="ABC1D23" />
              </label>

              <label>
                Telefone / WhatsApp
                <input name="visitorPhone" placeholder="(11) 99999-0000" />
              </label>

              <label>
                Observação para o Morador
                <input name="notes" placeholder="Ex: Pacote grande na portaria" />
              </label>

              <button style={{ background: "#0284c7", borderColor: "#0284c7", minHeight: "44px" }} type="submit">
                🔔 Notificar Morador no PWA
              </button>
            </form>
          </section>

          {/* Registro Rápido de Prestador Homologado */}
          <section className="app-panel operator-panel">
            <h2>🛠️ Entrada de Prestador Homologado</h2>
            <form action={registerSupplierAccessAction} className="auth-form">
              <label>
                Prestador Cadastrado *
                <select name="supplierName" required>
                  <option value="">Selecione a Empresa / Técnico</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({supplierCategoryLabels[s.category] ?? s.category}) - {s.allowed_time_start} às {s.allowed_time_end}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sentido
                <select defaultValue="entry" name="direction">
                  <option value="entry">Entrada</option>
                  <option value="exit">Saída</option>
                </select>
              </label>

              <label>
                Placa do Veículo / Crachá
                <input name="plate" placeholder="ABC1D23 ou Crachá" />
              </label>

              <label>
                Observações do Serviço
                <input name="notes" placeholder="Ex: Manutenção elevador torre B" />
              </label>

              <button type="submit">Registrar Acesso Prestador</button>
            </form>
          </section>

          {/* Liberação Manual */}
          <section className="app-panel operator-panel">
            <h2>Liberação Manual</h2>
            <form action={recordManualAccessAction} className="auth-form">
              <label>
                Nome ou Identificação
                <input name="visitorName" placeholder="Visitante, entrega ou colaborador" />
              </label>
              <label>
                Placa
                <input name="plate" placeholder="ABC1D23" />
              </label>
              <label>
                Unidade ou Destino
                <input name="unitReference" placeholder="Bloco A / 101" />
              </label>
              <label>
                Sentido
                <select defaultValue="entry" name="direction">
                  <option value="entry">Entrada</option>
                  <option value="exit">Saída</option>
                </select>
              </label>
              <label>
                Ponto de Acesso
                <select defaultValue="" name="accessPointId">
                  <option value="">Não acionar portão</option>
                  {accessPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Observação
                <input name="reason" placeholder="Motivo da liberação ou negação" />
              </label>
              <div className="split-actions">
                <button name="decision" type="submit" value="allow">
                  Liberar Acesso
                </button>
                <button className="danger-button" name="decision" type="submit" value="deny">
                  Negar
                </button>
              </div>
            </form>
          </section>

          {/* Status dos Portões */}
          <section className="app-panel operator-panel">
            <h2>Status dos Portões</h2>
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

          {/* Registrar Ocorrência */}
          <section className="app-panel operator-panel">
            <h2>Registrar Ocorrência na Portaria</h2>
            <form action={createOccurrenceAction} className="auth-form">
              <label>
                Título do Incidente *
                <input name="title" placeholder="Ex: Veículo bloqueando rampa, som alto..." required />
              </label>
              <label>
                Severidade
                <select defaultValue="medium" name="severity">
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </label>
              <label>
                Descrição dos Fatos
                <textarea name="description" placeholder="Descreva o ocorrido e medidas tomadas..." rows={2} />
              </label>
              <button type="submit">Gravar Ocorrência</button>
            </form>
          </section>

          {/* Ocorrências Abertas */}
          <section className="app-panel operator-panel">
            <h2>Ocorrências Abertas ({occurrences.length})</h2>
            <div className="list-stack">
              {occurrences.map((occurrence) => (
                <article className="list-row" key={occurrence.id}>
                  <div>
                    <strong>{occurrence.title}</strong>
                    <span>
                      Severidade {occurrence.severity} · {formatDate(occurrence.created_at)}
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
