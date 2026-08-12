import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "../actions";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { getAllowedOperationalModules } from "../../lib/operations/modules";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const profile = await requireAuthorizedProfile();
  const modules = getAllowedOperationalModules(profile.role);

  return (
    <div className="saas-shell">
      <aside className="saas-sidebar">
        <div className="brand-block">
          <span>CA</span>
          <div>
            <strong>Condo Admin</strong>
            <small>Operação do condomínio</small>
          </div>
        </div>

        <nav aria-label="Navegação principal" className="side-nav">
          <Link href="/dashboard">Dashboard</Link>
          {modules.map((module) => (
            <Link href={module.href} key={module.key}>
              {module.title}
            </Link>
          ))}
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
