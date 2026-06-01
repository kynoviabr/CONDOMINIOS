import Link from "next/link";
import { disablePlateBlacklistAction, upsertPlateBlacklistAction } from "./actions";
import { requireAuthorizedProfile } from "../../../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";

type PageParams = Promise<{ condominiumId: string }>;

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
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

export default async function CondominiumInvitesPage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  await requireAuthorizedProfile();
  const { condominiumId } = await params;
  const queryParams = await searchParams;
  const supabase = await createServerSupabaseClient();

  const [
    { data: condominium },
    { data: invitesData, error: invitesError },
    { data: validationsData, error: validationsError },
    { data: unitsData },
    { data: vehicleAccessesData },
    { data: plateBlacklistData }
  ] = await Promise.all([
    supabase
      .from("condominiums")
      .select("id, name, visitor_parking_capacity")
      .eq("id", condominiumId)
      .maybeSingle(),
    supabase
      .from("access_invites")
      .select("id, unit_id, visitor_name, plate, invite_type, status, expires_at, max_uses, use_count, created_at")
      .eq("condominium_id", condominiumId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("access_invite_validations")
      .select("id, invite_id, result, reason, created_at")
      .eq("condominium_id", condominiumId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("units")
      .select("id, block, number, floor")
      .eq("condominium_id", condominiumId)
      .order("block", { ascending: true })
      .order("number", { ascending: true }),
    supabase
      .from("visitor_vehicle_accesses")
      .select("id, plate, visitor_name, status, entered_at, exited_at")
      .eq("condominium_id", condominiumId)
      .order("entered_at", { ascending: false })
      .limit(50),
    supabase
      .from("vehicle_plate_blacklist")
      .select("id, plate, reason, status")
      .eq("condominium_id", condominiumId)
      .order("plate", { ascending: true })
  ]);

  const invites = (invitesData ?? []) as Invite[];
  const validations = (validationsData ?? []) as Validation[];
  const vehicleAccesses = (vehicleAccessesData ?? []) as VehicleAccess[];
  const activeVehicleAccesses = vehicleAccesses.filter((access) => access.status === "active");
  const plateBlacklist = (plateBlacklistData ?? []) as PlateBlacklist[];
  const unitsById = new Map(((unitsData ?? []) as Unit[]).map((unit) => [unit.id, unit]));

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Convites digitais</p>
          <h1>{condominium?.name ?? "Condomínio"}</h1>
          <p className="muted">Historico de convites, validade, limites de uso e validações da portaria.</p>
        </div>
        <Link className="button-link secondary" href={`/dashboard/condominiums/${condominiumId}`}>
          Voltar
        </Link>
      </header>

      {invitesError ? <p className="form-error">Falha ao carregar convites.</p> : null}
      {validationsError ? <p className="form-error">Falha ao carregar validações.</p> : null}
      {queryParams.status ? <p className="form-success">Operação concluída: {queryParams.status}</p> : null}

      <section className="admin-grid two-columns">
        <div className="admin-section">
          <h2>Vagas visitantes</h2>
          <p className="muted compact">
            {activeVehicleAccesses.length} veiculo(s) em permanencia
            {condominium?.visitor_parking_capacity
              ? ` de ${condominium.visitor_parking_capacity} vaga(s) configuradas`
              : ""}.
          </p>
          <div className="list-stack">
            {activeVehicleAccesses.map((access) => (
              <article className="list-row" key={access.id}>
                <div>
                  <strong>{access.plate}</strong>
                  <span>
                    {access.visitor_name} · entrada {formatDate(access.entered_at)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="admin-section">
          <h2>Blacklist de placas</h2>
          <form className="inline-form compact-form" action={upsertPlateBlacklistAction}>
            <input name="condominiumId" type="hidden" value={condominiumId} />
            <input name="plate" required placeholder="ABC1D23" />
            <input name="reason" placeholder="Motivo" />
            <button type="submit">Bloquear</button>
          </form>
          <div className="list-stack">
            {plateBlacklist.map((item) => (
              <article className="list-row" key={item.id}>
                <div>
                  <strong>{item.plate}</strong>
                  <span>
                    {item.status} · {item.reason ?? "sem motivo"}
                  </span>
                </div>
                {item.status === "active" ? (
                  <form action={disablePlateBlacklistAction}>
                    <input name="condominiumId" type="hidden" value={condominiumId} />
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
                  <td>{formatDate(invite.expires_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Validações recentes</h2>
        <div className="list-stack">
          {validations.map((validation) => (
            <article className="list-row" key={validation.id}>
              <div>
                <strong>{validation.result}</strong>
                <span>
                  {validation.reason ?? "Sem observacao"} · {formatDate(validation.created_at)}
                </span>
              </div>
              {validation.invite_id ? <small>{validation.invite_id}</small> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
