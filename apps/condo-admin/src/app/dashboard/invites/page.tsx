import { disablePlateBlacklistAction, upsertPlateBlacklistAction } from "./actions";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type Invite = {
  created_at: string;
  expires_at: string;
  id: string;
  invite_type: string;
  max_uses: number;
  plate: string | null;
  status: string;
  unit_id: string | null;
  use_count: number;
  visitor_name: string;
};

type Validation = {
  created_at: string;
  id: string;
  invite_id: string | null;
  reason: string | null;
  result: string;
};

type Unit = {
  block: string | null;
  floor: string | null;
  id: string;
  number: string;
};

type VehicleAccess = {
  entered_at: string;
  exited_at: string | null;
  id: string;
  plate: string;
  status: string;
  visitor_name: string;
};

type PlateBlacklist = {
  id: string;
  plate: string;
  reason: string | null;
  status: string;
};

type SearchParams = Promise<{ status?: string }>;

export const dynamic = "force-dynamic";

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone
  }).format(new Date(value));
}

function unitLabel(unit: Unit | undefined) {
  if (!unit) {
    return "Unidade removida";
  }

  return [unit.block, unit.number, unit.floor ? `${unit.floor} andar` : null]
    .filter(Boolean)
    .join(" / ");
}

function statusMessage(status?: string) {
  const labels: Record<string, string> = {
    blacklist_disabled: "Placa removida da lista de bloqueio.",
    blacklist_saved: "Placa adicionada à lista de bloqueio."
  };

  return status ? labels[status] ?? null : null;
}

function errorMessage(status?: string) {
  const labels: Record<string, string> = {
    blacklist_disable_failed: "Não foi possível desativar a placa.",
    blacklist_save_failed: "Não foi possível salvar a placa.",
    invalid_plate: "Informe uma placa brasileira válida.",
    missing_blacklist_id: "Não foi possível identificar o item da lista de bloqueio."
  };

  return status ? labels[status] ?? null : null;
}

export default async function CondominiumInvitesPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  await requireAuthorizedProfile();
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "invites");
  const queryParams = await searchParams;

  const { condominium } = context;
  const supabase = await createServerSupabaseClient();

  const [
    { data: invitesData, error: invitesError },
    { data: validationsData, error: validationsError },
    { data: unitsData },
    { data: vehicleAccessesData },
    { data: plateBlacklistData }
  ] = await Promise.all([
    supabase
      .from("access_invites")
      .select("id, unit_id, visitor_name, plate, invite_type, status, expires_at, max_uses, use_count, created_at")
      .eq("condominium_id", condominium.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("access_invite_validations")
      .select("id, invite_id, result, reason, created_at")
      .eq("condominium_id", condominium.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("units")
      .select("id, block, number, floor")
      .eq("condominium_id", condominium.id)
      .order("block", { ascending: true })
      .order("number", { ascending: true }),
    supabase
      .from("visitor_vehicle_accesses")
      .select("id, plate, visitor_name, status, entered_at, exited_at")
      .eq("condominium_id", condominium.id)
      .order("entered_at", { ascending: false })
      .limit(50),
    supabase
      .from("vehicle_plate_blacklist")
      .select("id, plate, reason, status")
      .eq("condominium_id", condominium.id)
      .order("plate", { ascending: true })
  ]);

  const invites = (invitesData ?? []) as Invite[];
  const validations = (validationsData ?? []) as Validation[];
  const vehicleAccesses = (vehicleAccessesData ?? []) as VehicleAccess[];
  const activeVehicleAccesses = vehicleAccesses.filter((access) => access.status === "active");
  const plateBlacklist = (plateBlacklistData ?? []) as PlateBlacklist[];
  const unitsById = new Map(((unitsData ?? []) as Unit[]).map((unit) => [unit.id, unit]));
  const success = statusMessage(queryParams.status);
  const failure = errorMessage(queryParams.status);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Convites e placas</h1>
          <p className="muted">
            Histórico de convites, validações, vagas visitantes e lista de bloqueio de placas do{" "}
            {condominium.name}.
          </p>
        </div>
      </header>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {invitesError ? <p className="form-error">Falha ao carregar convites.</p> : null}
      {validationsError ? <p className="form-error">Falha ao carregar validações.</p> : null}

      <section className="admin-grid">
        <div className="admin-section">
          <h2>Vagas visitantes</h2>
          <p className="muted">
            {activeVehicleAccesses.length} veículo(s) em permanência
            {condominium.visitorParkingCapacity
              ? ` de ${condominium.visitorParkingCapacity} vaga(s) configuradas`
              : ""}.
          </p>
          <div className="list-stack">
            {activeVehicleAccesses.map((access) => (
              <article className="list-row" key={access.id}>
                <div>
                  <strong>{access.plate}</strong>
                  <span>
                    {access.visitor_name} - entrada{" "}
                    {formatDate(access.entered_at, condominium.timezone)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="admin-section">
          <h2>Lista de bloqueio de placas</h2>
          <form className="inline-form compact-form" action={upsertPlateBlacklistAction}>
            <input name="condominiumId" type="hidden" value={condominium.id} />
            <input name="plate" required placeholder="ABC1D23" />
            <input name="reason" placeholder="Motivo" />
            <button type="submit">Bloquear</button>
          </form>
          <div className="list-stack compact-stack">
            {plateBlacklist.map((item) => (
              <article className="list-row" key={item.id}>
                <div>
                  <strong>{item.plate}</strong>
                  <span>
                    {item.status} - {item.reason ?? "sem motivo"}
                  </span>
                </div>
                {item.status === "active" ? (
                  <form action={disablePlateBlacklistAction}>
                    <input name="condominiumId" type="hidden" value={condominium.id} />
                    <input name="blacklistId" type="hidden" value={item.id} />
                    <button className="secondary compact-button" type="submit">
                      Desativar
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2>Convites recentes</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Visitante</th>
                <th>Placa</th>
                <th>Unidade</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Uso</th>
                <th>Validade</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.visitor_name}</td>
                  <td>{invite.plate ?? "Sem placa"}</td>
                  <td>{invite.unit_id ? unitLabel(unitsById.get(invite.unit_id)) : "Sem unidade"}</td>
                  <td>{invite.invite_type}</td>
                  <td>{invite.status}</td>
                  <td>
                    {invite.use_count}/{invite.max_uses}
                  </td>
                  <td>{formatDate(invite.expires_at, condominium.timezone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!invites.length ? <p className="muted">Nenhum convite encontrado.</p> : null}
      </section>

      <section className="admin-section">
        <h2>Validações recentes</h2>
        <div className="list-stack">
          {validations.map((validation) => (
            <article className="list-row" key={validation.id}>
              <div>
                <strong>{validation.result}</strong>
                <span>
                  {validation.reason ?? "Sem observação"} -{" "}
                  {formatDate(validation.created_at, condominium.timezone)}
                </span>
              </div>
              {validation.invite_id ? <small>{validation.invite_id}</small> : null}
            </article>
          ))}
        </div>
        {!validations.length ? <p className="muted">Nenhuma validação encontrada.</p> : null}
      </section>
    </main>
  );
}
