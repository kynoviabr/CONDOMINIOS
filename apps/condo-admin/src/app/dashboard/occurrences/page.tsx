import { occurrenceSeverities, occurrenceStatuses } from "@kynovia/database";
import Link from "next/link";
import { createOccurrenceAction, updateOccurrenceAction } from "./actions";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{ status?: string; state?: string }>;

type Occurrence = {
  created_at: string;
  description: string | null;
  id: string;
  severity: string;
  status: string;
  title: string;
};

export const dynamic = "force-dynamic";

function severityLabel(severity: string) {
  const labels: Record<string, string> = {
    critical: "Critica",
    high: "Alta",
    low: "Baixa",
    medium: "Media"
  };

  return labels[severity] ?? severity;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    dismissed: "Descartada",
    open: "Aberta",
    resolved: "Resolvida"
  };

  return labels[status] ?? status;
}

function statusMessage(status?: string) {
  const labels: Record<string, string> = {
    occurrence_created: "Ocorrencia registrada.",
    occurrence_updated: "Ocorrencia atualizada."
  };

  return status ? labels[status] ?? null : null;
}

function errorMessage(status?: string) {
  const labels: Record<string, string> = {
    create_occurrence_failed: "Não foi possível registrar a ocorrência.",
    missing_occurrence_fields: "Informe titulo, criticidade e status válidos.",
    update_occurrence_failed: "Não foi possível atualizar a ocorrência."
  };

  return status ? labels[status] ?? null : null;
}

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone
  }).format(new Date(value));
}

export default async function OccurrencesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "occurrences");
  const queryParams = await searchParams;

  const { condominium } = context;
  const stateFilter = queryParams.state?.trim() ?? "open";
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("gatehouse_occurrences")
    .select("id, title, description, severity, status, created_at")
    .eq("condominium_id", condominium.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (occurrenceStatuses.includes(stateFilter as (typeof occurrenceStatuses)[number])) {
    query = query.eq("status", stateFilter);
  }

  const { data: occurrencesData, error } = await query;
  const occurrences = (occurrencesData ?? []) as Occurrence[];
  const success = statusMessage(queryParams.status);
  const failure = errorMessage(queryParams.status);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Ocorrencias</h1>
          <p className="muted">
            Registro administrativo de ocorrências operacionais do {condominium.name}.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar
        </Link>
      </header>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {error ? <p className="form-error">Falha ao carregar ocorrências.</p> : null}

      <section className="toolbar">
        <form className="filter-form">
          <label>
            Status
            <select name="state" defaultValue={stateFilter}>
              <option value="">Todos</option>
              {occurrenceStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href="/dashboard/occurrences">
            Limpar
          </Link>
        </form>
      </section>

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Nova ocorrência</h2>
          <form className="admin-form" action={createOccurrenceAction}>
            <input name="condominiumId" type="hidden" value={condominium.id} />
            <label>
              Titulo
              <input name="title" required placeholder="Tentativa de acesso negada" />
            </label>
            <label>
              Criticidade
              <select name="severity" defaultValue="medium">
                {occurrenceSeverities.map((severity) => (
                  <option key={severity} value={severity}>
                    {severityLabel(severity)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Descricao
              <textarea name="description" rows={3} />
            </label>
            <button type="submit">Registrar ocorrência</button>
          </form>
        </div>

        <div className="admin-section">
          <h2>Escopo operacional</h2>
          <p className="muted">
            Esta tela organiza ocorrências administrativas. A operação em tempo real da portaria
            permanece no app `web-portaria`.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <h2>Ocorrencias cadastradas</h2>
        <div className="list-stack">
          {occurrences.map((occurrence) => (
            <article className="management-record" key={occurrence.id}>
              <form className="record-grid" action={updateOccurrenceAction}>
                <input name="condominiumId" type="hidden" value={condominium.id} />
                <input name="occurrenceId" type="hidden" value={occurrence.id} />
                <label>
                  Titulo
                  <input name="title" required defaultValue={occurrence.title} />
                </label>
                <label>
                  Criticidade
                  <select name="severity" defaultValue={occurrence.severity}>
                    {occurrenceSeverities.map((severity) => (
                      <option key={severity} value={severity}>
                        {severityLabel(severity)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select name="status" defaultValue={occurrence.status}>
                    {occurrenceStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Criada em
                  <input value={formatDate(occurrence.created_at, condominium.timezone)} readOnly />
                </label>
                <label>
                  Descricao
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={occurrence.description ?? ""}
                  />
                </label>
                <button type="submit">Salvar ocorrência</button>
              </form>
            </article>
          ))}
        </div>
        {!occurrences.length ? <p className="muted">Nenhuma ocorrência encontrada.</p> : null}
      </section>
    </main>
  );
}
