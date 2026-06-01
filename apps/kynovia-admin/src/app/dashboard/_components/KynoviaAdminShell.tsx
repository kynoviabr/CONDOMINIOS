import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "../../actions";
import { kynoviaAdminNavigation } from "../../../lib/customers/metadata";
import type { AuthProfile } from "@kynovia/auth";

type KynoviaAdminShellProps = {
  active: "customers" | "dashboard" | "users";
  children: ReactNode;
  description: string;
  profile: AuthProfile;
  title: string;
};

export function KynoviaAdminShell({
  active,
  children,
  description,
  profile,
  title
}: KynoviaAdminShellProps) {
  return (
    <div className="saas-shell">
      <aside className="saas-sidebar">
        <div className="brand-block">
          <span>KA</span>
          <div>
            <strong>Kynovia Condo Admin</strong>
            <small>Backoffice interno</small>
          </div>
        </div>

        <nav aria-label="Navegacao principal" className="side-nav">
          {kynoviaAdminNavigation.map((item) => (
            <Link
              aria-current={active === item.key ? "page" : undefined}
              className={active === item.key ? "active" : ""}
              href={item.href}
              key={item.key}
            >
              {item.label}
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

      <div className="saas-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Kynovia Condo Admin</p>
            <h1>{title}</h1>
            <p className="muted">{description}</p>
          </div>
          <div className="topbar-profile">
            <span>{profile.fullName}</span>
            <small>{profile.role}</small>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
