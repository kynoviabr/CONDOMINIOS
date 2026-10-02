import Link from "next/link";
import { signOutAction } from "../actions";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { createServerSupabaseClient } from "../../lib/supabase/server";

type Resident = {
  id: string;
  condominium_id: string;
  status: string;
};

type Invite = {
  expires_at: string;
  id: string;
  status: string;
  visitor_name: string;
};

type Approval = {
  created_at: string;
  id: string;
  visitor_name: string;
};

type VehicleAccess = {
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

export default async function HomePage() {
  const profile = await requireAuthorizedProfile();
  const supabase = await createServerSupabaseClient();
  const { data: residentData } = await supabase
    .from("residents")
    .select("id, condominium_id, status")
    .eq("profile_id", profile.id)
    .eq("tenant_id", profile.tenantId)
    .maybeSingle();

  const resident = residentData as Resident | null;
  const [{ data: invitesData }, { data: approvalsData }, { data: activeVehiclesData }] = resident
    ? await Promise.all([
        supabase
          .from("access_invites")
          .select("id, visitor_name, status, expires_at")
          .eq("resident_id", resident.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("resident_access_approvals")
          .select("id, visitor_name, created_at")
          .eq("resident_id", resident.id)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("visitor_vehicle_accesses")
          .select("id, plate, visitor_name, entered_at")
          .eq("condominium_id", resident.condominium_id)
          .eq("status", "active")
          .order("entered_at", { ascending: false })
          .limit(5)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const invites = (invitesData ?? []) as Invite[];
  const approvals = (approvalsData ?? []) as Approval[];
  const activeVehicles = (activeVehiclesData ?? []) as VehicleAccess[];
  const activeInvites = invites.filter((invite) => invite.status === "active").length;

  return (
    <main className="mobile-shell">
      <header className="mobile-header resident-hero">
        <div>
          <p className="eyebrow">Kynovia Access</p>
          <h1>Morador</h1>
          <p className="muted">Convites, aprovações e acessos recentes em uma tela rápida para uso diário.</p>
        </div>
        <form action={signOutAction}>
          <button className="secondary" type="submit">
            Sair
          </button>
        </form>
      </header>

      {!resident ? <p className="form-error">Seu perfil ainda não esta vinculado a um morador ativo.</p> : null}
      {resident && resident.status !== "active" ? (
        <p className="form-error">Seu cadastro de morador esta {resident.status}.</p>
      ) : null}

      <section className="resident-summary">
        <article>
          <span>Convites ativos</span>
          <strong>{activeInvites}</strong>
        </article>
        <article>
          <span>Aprovações</span>
          <strong>{approvals.length}</strong>
        </article>
        <article>
          <span>No condomínio</span>
          <strong>{activeVehicles.length}</strong>
        </article>
      </section>

      <section className="quick-actions resident-actions">
        <Link className="button-link" href="/home/invites">
          Novo convite
        </Link>
        <Link className="button-link secondary" href="/home/invites#pendentes">
          Aprovar visitante
        </Link>
        <Link className="button-link secondary" href="/home/invites#favoritos">
          Favoritos
        </Link>
      </section>

      <section className="app-panel">
        <h2>Notificações</h2>
        <div className="list-stack">
          {approvals.map((approval) => (
            <article className="list-row alert-row" key={approval.id}>
              <div>
                <strong>{approval.visitor_name}</strong>
                <span>Aguardando aprovação desde {formatDate(approval.created_at)}</span>
              </div>
              <Link className="button-link compact-button" href="/home/invites#pendentes">
                Ver
              </Link>
            </article>
          ))}
          {approvals.length === 0 ? <p className="muted compact">Nenhuma aprovação pendente agora.</p> : null}
        </div>
      </section>

      <section className="app-panel">
        <h2>Convites recentes</h2>
        <div className="list-stack">
          {invites.map((invite) => (
            <article className="list-row" key={invite.id}>
              <div>
                <strong>{invite.visitor_name}</strong>
                <span>
                  {invite.status} · vence {formatDate(invite.expires_at)}
                </span>
              </div>
            </article>
          ))}
          {invites.length === 0 ? <p className="muted compact">Nenhum convite criado ainda.</p> : null}
        </div>
      </section>

      <footer className="resident-footer">
        <span>{profile.fullName}</span>
        <span>{profile.role}</span>
      </footer>
    </main>
  );
}
