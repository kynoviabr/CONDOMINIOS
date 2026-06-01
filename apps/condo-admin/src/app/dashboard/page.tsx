import Link from "next/link";
import { AdminDashboardShell } from "@kynovia/ui";
import { signOutAction } from "../actions";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { getCondoAdminContext } from "../../lib/condominiums/context";
import { getAllowedOperationalModules } from "../../lib/operations/modules";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireAuthorizedProfile();
  const context = await getCondoAdminContext();
  const condominium = context?.condominium ?? null;
  const modules = getAllowedOperationalModules(profile.role);

  return (
    <AdminDashboardShell
      eyebrow="Condo Admin"
      title={condominium ? condominium.name : "Administração do condomínio"}
      description="Portal do administrador do condomínio para gestão operacional do próprio ambiente."
      profile={profile}
      signOutAction={signOutAction}
    >
      {condominium ? (
        <>
          <section className="condo-overview">
            <div className="metric-card">
              <span>Condomínio</span>
              <strong>{condominium.name}</strong>
            </div>
            <div className="metric-card">
              <span>Perfil operacional</span>
              <strong>{profile.role}</strong>
            </div>
            <div className="metric-card">
              <span>Módulos liberados</span>
              <strong>{modules.length}</strong>
            </div>
          </section>
          <section className="quick-actions">
            {modules.map((module) => (
              <Link className="module-card" href={module.href} key={module.key}>
                <span>{module.title}</span>
                <strong>{module.description}</strong>
                {module.phase === "foundation" ? <small>Módulo em fundação</small> : null}
              </Link>
            ))}
          </section>
        </>
      ) : (
        <p className="form-error">
          Nenhum condomínio ativo foi encontrado para este perfil. Solicite o vínculo de
          implantação ao suporte Kynovia.
        </p>
      )}
    </AdminDashboardShell>
  );
}
