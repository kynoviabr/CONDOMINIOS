import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthorizedProfile } from "../../lib/auth/session";
import { getCondoAdminContext } from "../../lib/condominiums/context";
import { getAllowedOperationalModules } from "../../lib/operations/modules";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireAuthorizedProfile();
  const context = await getCondoAdminContext();
  const condominium = context?.condominium ?? null;
  const modules = getAllowedOperationalModules(profile.role);

  if (condominium && !condominium.unitRegistrationMode) {
    redirect("/dashboard/settings?onboarding=unit_structure");
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Dashboard operacional</h1>
          <p className="muted">
            Visao inicial da administracao do condominio. Use o menu lateral para abrir apenas o
            modulo operacional desejado.
          </p>
        </div>
      </header>
      {condominium ? (
        <>
          <section className="condo-overview">
            <div className="metric-card">
              <span>Condominio</span>
              <strong>{condominium.name}</strong>
            </div>
            <div className="metric-card">
              <span>Perfil operacional</span>
              <strong>{profile.role}</strong>
            </div>
            <div className="metric-card">
              <span>Modulos liberados</span>
              <strong>{modules.length}</strong>
            </div>
          </section>
          <section className="quick-actions">
            {modules.map((module) => (
              <Link className="module-card" href={module.href} key={module.key}>
                <span>{module.title}</span>
                <strong>{module.description}</strong>
                {module.phase === "foundation" ? <small>Modulo em fundacao</small> : null}
              </Link>
            ))}
          </section>
        </>
      ) : (
        <p className="form-error">
          Nenhum condominio ativo foi encontrado para este perfil. Solicite o vinculo de
          implantacao ao suporte Kynovia.
        </p>
      )}
    </main>
  );
}
