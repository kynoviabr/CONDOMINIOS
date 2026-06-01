import { requireAuthorizedProfile } from "../../lib/auth/session";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireAuthorizedProfile();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Kynovia Access</p>
          <h1>Admin</h1>
          <p className="muted">Sessão autenticada e autorizada para administração.</p>
        </div>
      </header>
      <section className="app-panel">
        <dl className="profile-list">
          <div>
            <dt>Usuário</dt>
            <dd>{profile.fullName}</dd>
          </div>
          <div>
            <dt>Perfil</dt>
            <dd>{profile.role}</dd>
          </div>
          <div>
            <dt>Tenant</dt>
            <dd>{profile.tenantId}</dd>
          </div>
        </dl>
        <Link className="button-link" href="/dashboard/condominiums">
          Gerenciar condomínios
        </Link>
      </section>
    </main>
  );
}
