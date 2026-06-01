import type { ReactNode } from "react";
import { signOutAction } from "../actions";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { getCondoAdminContext } from "../../lib/condominiums/context";
import { getAllowedOperationalModules } from "../../lib/operations/modules";
import { DashboardNav } from "./DashboardNav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const profile = await requireAuthorizedProfile();
  const context = await getCondoAdminContext();
  const condominium = context?.condominium ?? null;
  const modules = getAllowedOperationalModules(profile.role);
  const initials = condominium?.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase() || "CA";

  return (
    <div className="condo-admin-layout">
      <aside className="condo-sidebar">
        <div className="condo-brand">
          <div className="condo-logo" aria-hidden="true">
            {initials}
          </div>
          <div>
            <strong>{condominium?.name ?? "Condo Admin"}</strong>
            <span>Gestao operacional</span>
          </div>
        </div>
        <DashboardNav modules={modules} />
        <form action={signOutAction} className="condo-sidebar-footer">
          <button className="secondary" type="submit">
            Sair
          </button>
        </form>
      </aside>
      <div className="condo-main">
        <header className="condo-topbar">
          <div className="condo-logo" aria-hidden="true">
            {initials}
          </div>
          <div>
            <span>Condominio ativo</span>
            <strong>{condominium?.name ?? "Nenhum condominio vinculado"}</strong>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
