import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "../actions";
import { requireAuthorizedProfile } from "../../lib/auth/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const profile = await requireAuthorizedProfile();

  return (
    <div className="saas-shell">
      <aside className="saas-sidebar">
        <div className="brand-block">
          <span>KA</span>
          <div>
            <strong>Kynovia Admin</strong>
            <small>Administração SaaS</small>
          </div>
        </div>

        <nav aria-label="Navegação principal" className="side-nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/condominiums">Condomínios</Link>
        </nav>

        <div className="sidebar-footer">
          <div>
            <span>{profile.fullName}</span>
            <small>{profile.role}</small>
          </div>
          <form action={signOutAction}>
            <button className="secondary" type="submit">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="saas-content">{children}</div>
    </div>
  );
}
