import { accessPointKinds } from "@kynovia/database";
import Link from "next/link";
import {
  createAccessPointAction,
  deleteAccessPointAction,
  updateAccessPointAction
} from "./actions";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{ status?: string }>;

type AccessPoint = {
  id: string;
  kind: string;
  name: string;
};

type GateCommand = {
  command: string;
  created_at: string;
  id: string;
  status: string;
};

export const dynamic = "force-dynamic";

function kindLabel(kind: string) {
  const labels: Record<string, string> = {
    pedestrian_gate: "Portao pedestre",
    vehicle_gate: "Portao veicular",
    garage_gate: "Garagem",
    service_gate: "Servico"
  };

  return labels[kind] ?? kind;
}

function statusMessage(status?: string) {
  const labels: Record<string, string> = {
    access_point_created: "Ponto de acesso cadastrado.",
    access_point_deleted: "Ponto de acesso removido.",
    access_point_updated: "Ponto de acesso atualizado."
  };

  return status ? labels[status] ?? null : null;
}

function errorMessage(status?: string) {
  const labels: Record<string, string> = {
    create_access_point_failed: "Não foi possível cadastrar o ponto de acesso.",
    delete_access_point_failed: "Não foi possível remover o ponto de acesso.",
    missing_access_point_fields: "Informe nome e tipo do ponto de acesso.",
    missing_access_point_id: "Não foi possível identificar o ponto de acesso.",
    update_access_point_failed: "Não foi possível atualizar o ponto de acesso."
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

export default async function GatesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "gates");
  const queryParams = await searchParams;

  const { condominium } = context;
  const supabase = await createServerSupabaseClient();
  const [{ data: accessPointsData, error: accessPointsError }, { data: commandsData }] =
    await Promise.all([
      supabase
        .from("access_points")
        .select("id, name, kind")
        .eq("condominium_id", condominium.id)
        .order("name", { ascending: true }),
      supabase
        .from("gate_commands")
        .select("id, command, status, created_at")
        .eq("condominium_id", condominium.id)
        .order("created_at", { ascending: false })
        .limit(20)
    ]);

  const accessPoints = (accessPointsData ?? []) as AccessPoint[];
  const commands = (commandsData ?? []) as GateCommand[];
  const success = statusMessage(queryParams.status);
  const failure = errorMessage(queryParams.status);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Portoes e cancelas</h1>
          <p className="muted">
            Configuracao dos pontos de acesso do {condominium.name}. Comandos fisicos reais
            continuam restritos a operação da portaria e provedores configurados.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar
        </Link>
      </header>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {accessPointsError ? <p className="form-error">Falha ao carregar pontos de acesso.</p> : null}

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Novo ponto de acesso</h2>
          <form className="admin-form" action={createAccessPointAction}>
            <input name="condominiumId" type="hidden" value={condominium.id} />
            <label>
              Nome
              <input name="name" required placeholder="Portao social" />
            </label>
            <label>
              Tipo
              <select name="kind" defaultValue="pedestrian_gate">
                {accessPointKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {kindLabel(kind)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Cadastrar ponto</button>
          </form>
        </div>

        <div className="admin-section">
          <h2>Comandos recentes</h2>
          <div className="list-stack">
            {commands.map((command) => (
              <article className="list-row" key={command.id}>
                <div>
                  <strong>{command.command}</strong>
                  <span>
                    {command.status} - {formatDate(command.created_at, condominium.timezone)}
                  </span>
                </div>
              </article>
            ))}
          </div>
          {!commands.length ? <p className="muted">Nenhum comando registrado.</p> : null}
        </div>
      </section>

      <section className="admin-section">
        <h2>Pontos cadastrados</h2>
        <div className="list-stack">
          {accessPoints.map((accessPoint) => (
            <article className="management-record" key={accessPoint.id}>
              <form className="record-grid" action={updateAccessPointAction}>
                <input name="condominiumId" type="hidden" value={condominium.id} />
                <input name="accessPointId" type="hidden" value={accessPoint.id} />
                <label>
                  Nome
                  <input name="name" required defaultValue={accessPoint.name} />
                </label>
                <label>
                  Tipo
                  <select name="kind" defaultValue={accessPoint.kind}>
                    {accessPointKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {kindLabel(kind)}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit">Salvar</button>
              </form>
              <form action={deleteAccessPointAction}>
                <input name="condominiumId" type="hidden" value={condominium.id} />
                <input name="accessPointId" type="hidden" value={accessPoint.id} />
                <button className="secondary" type="submit">
                  Remover
                </button>
              </form>
            </article>
          ))}
        </div>
        {!accessPoints.length ? <p className="muted">Nenhum ponto de acesso cadastrado.</p> : null}
      </section>
    </main>
  );
}
