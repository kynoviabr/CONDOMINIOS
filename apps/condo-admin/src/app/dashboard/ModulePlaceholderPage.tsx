import { requireAuthorizedProfile } from "../../lib/auth/session";
import { getCondoAdminContext } from "../../lib/condominiums/context";
import {
  operationalModules,
  requireOperationalModuleAccess
} from "../../lib/operations/modules";

type ModulePlaceholderPageProps = {
  moduleKey: string;
};

export async function ModulePlaceholderPage({ moduleKey }: ModulePlaceholderPageProps) {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), moduleKey);
  const module = operationalModules.find((item) => item.key === moduleKey);

  if (!module) {
    return null;
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>{module.title}</h1>
          <p className="muted">
            {module.description} Escopo operacional limitado ao condomínio {context.condominium.name}.
          </p>
        </div>
      </header>

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Escopo do módulo</h2>
          <div className="chips">
            {module.scope.map((item) => (
              <span className="chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="admin-section">
          <h2>Status</h2>
          <p className="muted">
            Este módulo esta em fase de fundação operacional. Nenhum CRUD completo, integração real
            de hardware ou automacao externa foi ativado nesta etapa.
          </p>
          {module.key === "common_areas" ? (
            <div className="chips">
              {[
                "Salao de festas",
                "Churrasqueira",
                "Piscina",
                "Area Pet",
                "Campo de futebol",
                "Quadra de Beach Tennis",
                "Quadra poliesportiva",
                "Outra"
              ].map((area) => (
                <span className="chip" key={area}>{area}</span>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
