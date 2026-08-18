import { buildInviteQrPayload } from "@kynovia/database";
import { ShareInviteButton } from "./ShareInviteButton";
import Link from "next/link";
import QRCode from "qrcode";
import {
  archiveFavoriteVisitorAction,
  cancelInviteAction,
  createFavoriteVisitorAction,
  createInviteAction,
  decideAccessApprovalAction
} from "./actions";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{
  created?: string;
  error?: string;
  status?: string;
  token?: string;
}>;

type Resident = {
  condominium_id: string;
  id: string;
  status: string;
};

type ResidentUnit = {
  unit_id: string;
};

type Unit = {
  block: string | null;
  floor: string | null;
  id: string;
  number: string;
};

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

type FavoriteVisitor = {
  id: string;
  notes: string | null;
  plate: string | null;
  unit_id: string | null;
  visitor_name: string;
  visitor_phone: string | null;
};

type Approval = {
  created_at: string;
  expires_at: string;
  id: string;
  notes: string | null;
  plate: string | null;
  unit_id: string | null;
  visitor_name: string;
  visitor_phone: string | null;
};

type Validation = {
  created_at: string;
  id: string;
  reason: string | null;
  result: string;
};

type VehicleAccess = {
  entered_at: string;
  exited_at: string | null;
  id: string;
  plate: string;
  status: string;
  visitor_name: string;
};

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
    return "Unidade";
  }

  return [unit.block, unit.number, unit.floor ? `${unit.floor} andar` : null].filter(Boolean).join(" / ");
}

function statusMessage(status: string | undefined) {
  const messages: Record<string, string> = {
    approval_approved: "Visitante aprovado.",
    approval_rejected: "Visitante recusado.",
    favorite_archived: "Favorito arquivado.",
    favorite_created: "Favorito salvo.",
    invite_cancelled: "Convite cancelado.",
    invite_created: "Convite criado."
  };

  return status ? messages[status] ?? status : null;
}

function errorMessage(error: string | undefined) {
  const messages: Record<string, string> = {
    approval_update_failed: "Não foi possível atualizar a aprovação.",
    cancel_invite_failed: "Não foi possível cancelar o convite.",
    create_favorite_failed: "Não foi possível salvar o favorito.",
    create_invite_failed: "Não foi possível criar o convite.",
    invalid_approval_decision: "Decisao de aprovação invalida.",
    invalid_invite_window: "A validade precisa ser posterior ao inicio.",
    invalid_plate: "Placa invalida.",
    missing_favorite_fields: "Informe unidade e nome para salvar favorito.",
    missing_invite_fields: "Informe os dados obrigatórios do convite.",
    resident_not_active: "Morador inativo ou não encontrado.",
    unit_not_allowed: "Unidade não permitida para este morador.",
    unauthorized_invite: "Você não possui permissão para emitir convites para esta unidade."
  };

  return error ? messages[error] ?? error : null;
}

export default async function InvitesPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireAuthorizedProfile();
  const queryParams = await searchParams;
  const supabase = await createServerSupabaseClient();

  const { data: residentData } = await supabase
    .from("residents")
    .select("id, condominium_id, status")
    .eq("profile_id", profile.id)
    .eq("tenant_id", profile.tenantId)
    .maybeSingle();

  const resident = residentData as Resident | null;
  const [
    { data: residentUnitsData },
    { data: invitesData },
    { data: favoritesData },
    { data: approvalsData },
    { data: validationsData },
    { data: vehicleAccessesData }
  ] = resident
    ? await Promise.all([
        supabase
          .from("resident_units")
          .select("unit_id")
          .eq("resident_id", resident.id)
          .order("is_primary", { ascending: false }),
        supabase
          .from("access_invites")
          .select("id, unit_id, visitor_name, plate, invite_type, status, expires_at, max_uses, use_count, created_at")
          .eq("resident_id", resident.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("resident_favorite_visitors")
          .select("id, unit_id, visitor_name, visitor_phone, plate, notes")
          .eq("resident_id", resident.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("resident_access_approvals")
          .select("id, unit_id, visitor_name, visitor_phone, plate, notes, expires_at, created_at")
          .eq("resident_id", resident.id)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("access_invite_validations")
          .select("id, result, reason, created_at")
          .eq("condominium_id", resident.condominium_id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("visitor_vehicle_accesses")
          .select("id, plate, visitor_name, status, entered_at, exited_at")
          .eq("condominium_id", resident.condominium_id)
          .order("entered_at", { ascending: false })
          .limit(20)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const residentUnits = (residentUnitsData ?? []) as ResidentUnit[];
  const unitIds = residentUnits.map((unit) => unit.unit_id);
  const { data: unitsData } = unitIds.length
    ? await supabase.from("units").select("id, block, number, floor").in("id", unitIds)
    : { data: [] };
  const unitsById = new Map(((unitsData ?? []) as Unit[]).map((unit) => [unit.id, unit]));
  const invites = (invitesData ?? []) as Invite[];
  const favorites = (favoritesData ?? []) as FavoriteVisitor[];
  const approvals = (approvalsData ?? []) as Approval[];
  const validations = (validationsData ?? []) as Validation[];
  const vehicleAccesses = (vehicleAccessesData ?? []) as VehicleAccess[];
  const qrDataUrl =
    queryParams.created && queryParams.token
      ? await QRCode.toDataURL(buildInviteQrPayload(queryParams.created, queryParams.token), {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 240
        })
      : null;
  const success = statusMessage(queryParams.status);
  const failure = errorMessage(queryParams.error);

  return (
    <main className="mobile-shell">
      <header className="mobile-header">
        <div>
          <p className="eyebrow">App do morador</p>
          <h1>Convites e acessos</h1>
          <p className="muted">Crie convites, aprove visitantes pendentes e acompanhe histórico recente.</p>
        </div>
        <Link className="button-link secondary" href="/home">
          Inicio
        </Link>
      </header>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {!resident ? <p className="form-error">Seu perfil ainda não esta vinculado a um morador ativo.</p> : null}
      {resident && resident.status !== "active" ? (
        <p className="form-error">Convites disponiveis apenas para moradores ativos.</p>
      ) : null}

      {qrDataUrl ? (
        <section className="app-panel qr-panel" style={{ textAlign: "center" }}>
          <h2>QR Code do Convite</h2>
          <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
            <img
              alt="QR Code do convite"
              height={240}
              src={qrDataUrl}
              style={{ borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              width={240}
            />
          </div>
          <p className="muted compact">
            Apresente este código na portaria ou envie diretamente para o visitante.
          </p>
          <ShareInviteButton
            expiresAt={
              invites.find((i) => i.id === queryParams.created)?.expires_at
                ? formatDate(invites.find((i) => i.id === queryParams.created)!.expires_at)
                : "data limite"
            }
            inviteId={queryParams.created ?? ""}
            visitorName={
              invites.find((i) => i.id === queryParams.created)?.visitor_name ?? "Visitante"
            }
          />
        </section>
      ) : null}

      <section className="app-panel" id="pendentes">
        <h2>Aprovações pendentes</h2>
        <div className="list-stack">
          {approvals.map((approval) => (
            <article className="list-row approval-row" key={approval.id}>
              <div>
                <strong>{approval.visitor_name}</strong>
                <span>
                  {approval.plate ?? "sem placa"} · {approval.visitor_phone ?? "sem telefone"} · expira{" "}
                  {formatDate(approval.expires_at)}
                </span>
                {approval.notes ? <span>{approval.notes}</span> : null}
              </div>
              {approval.unit_id ? (
                <div className="inline-actions">
                  <form action={decideAccessApprovalAction}>
                    <input name="approvalId" type="hidden" value={approval.id} />
                    <input name="unitId" type="hidden" value={approval.unit_id} />
                    <button name="decision" type="submit" value="approved">
                      Aprovar
                    </button>
                  </form>
                  <form action={decideAccessApprovalAction}>
                    <input name="approvalId" type="hidden" value={approval.id} />
                    <input name="unitId" type="hidden" value={approval.unit_id} />
                    <button className="danger compact-button" name="decision" type="submit" value="rejected">
                      Recusar
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
          {approvals.length === 0 ? <p className="muted compact">Nenhum visitante pendente de aprovação.</p> : null}
        </div>
      </section>

      <section className="app-panel">
        <h2>Novo convite</h2>
        <form className="auth-form" action={createInviteAction}>
          <label>
            Favorito
            <select name="favoriteId" defaultValue="">
              <option value="">Preencher manualmente</option>
              {favorites.map((favorite) => (
                <option key={favorite.id} value={favorite.id}>
                  {favorite.visitor_name} {favorite.plate ? `- ${favorite.plate}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Unidade
            <select name="unitId" required>
              <option value="">Selecione</option>
              {residentUnits.map((unit) => (
                <option key={unit.unit_id} value={unit.unit_id}>
                  {unitLabel(unitsById.get(unit.unit_id))}
                </option>
              ))}
            </select>
          </label>
          <label>
            Visitante
            <input name="visitorName" placeholder="Nome do visitante" />
          </label>
          <label>
            Telefone
            <input name="visitorPhone" placeholder="(11) 99999-0000" />
          </label>
          <label>
            Placa do visitante
            <input name="plate" placeholder="ABC1D23" />
          </label>
          <label>
            Inicio
            <input name="startsAt" type="datetime-local" />
          </label>
          <label>
            Validade
            <input name="expiresAt" required type="datetime-local" />
          </label>
          <label>
            Usos permitidos
            <input defaultValue="1" min="1" name="maxUses" type="number" />
          </label>
          <label>
            Tipo
            <select name="inviteType" defaultValue="single">
              <option value="single">Unico</option>
              <option value="recurring">Recorrente</option>
            </select>
          </label>
          <label>
            Regra de recorrencia
            <input name="recurrenceRule" placeholder="Ex.: semanal, seg-sex" />
          </label>
          <button type="submit">Gerar convite</button>
        </form>
      </section>

      <section className="app-panel" id="favoritos">
        <h2>Favoritos</h2>
        <form className="auth-form favorite-form" action={createFavoriteVisitorAction}>
          <label>
            Unidade
            <select name="unitId" required>
              <option value="">Selecione</option>
              {residentUnits.map((unit) => (
                <option key={unit.unit_id} value={unit.unit_id}>
                  {unitLabel(unitsById.get(unit.unit_id))}
                </option>
              ))}
            </select>
          </label>
          <label>
            Visitante
            <input name="visitorName" required placeholder="Nome frequente" />
          </label>
          <label>
            Telefone
            <input name="visitorPhone" placeholder="(11) 99999-0000" />
          </label>
          <label>
            Placa
            <input name="plate" placeholder="ABC1D23" />
          </label>
          <label>
            Observacao
            <input name="notes" placeholder="Ex.: familiar, diarista, entrega recorrente" />
          </label>
          <button type="submit">Salvar favorito</button>
        </form>
        <div className="list-stack section-gap">
          {favorites.map((favorite) => (
            <article className="list-row" key={favorite.id}>
              <div>
                <strong>{favorite.visitor_name}</strong>
                <span>
                  {favorite.plate ?? "sem placa"} · {favorite.visitor_phone ?? "sem telefone"} ·{" "}
                  {favorite.notes ?? "sem observacao"}
                </span>
              </div>
              {favorite.unit_id ? (
                <form action={archiveFavoriteVisitorAction}>
                  <input name="favoriteId" type="hidden" value={favorite.id} />
                  <input name="unitId" type="hidden" value={favorite.unit_id} />
                  <button className="secondary compact-button" type="submit">
                    Arquivar
                  </button>
                </form>
              ) : null}
            </article>
          ))}
          {favorites.length === 0 ? <p className="muted compact">Nenhum favorito salvo ainda.</p> : null}
        </div>
      </section>

      <section className="app-panel invite-history">
        <h2>Historico de convites</h2>
        <div className="list-stack">
          {invites.map((invite) => (
            <article className="list-row" key={invite.id}>
              <div>
                <strong>{invite.visitor_name}</strong>
                <span>
                  {invite.invite_type} · {invite.plate ?? "sem placa"} · {invite.status} · {invite.use_count}/
                  {invite.max_uses} entradas · vence {formatDate(invite.expires_at)}
                </span>
              </div>
              {invite.status === "active" && invite.unit_id ? (
                <form action={cancelInviteAction}>
                  <input name="inviteId" type="hidden" value={invite.id} />
                  <input name="unitId" type="hidden" value={invite.unit_id} />
                  <button className="danger compact-button" type="submit">
                    Cancelar
                  </button>
                </form>
              ) : null}
            </article>
          ))}
          {invites.length === 0 ? <p className="muted compact">Nenhum convite criado ainda.</p> : null}
        </div>
      </section>

      <section className="app-panel">
        <h2>Historico de acessos</h2>
        <div className="list-stack">
          {vehicleAccesses.map((access) => (
            <article className="list-row" key={access.id}>
              <div>
                <strong>{access.visitor_name}</strong>
                <span>
                  {access.plate} · {access.status} · entrada {formatDate(access.entered_at)}
                  {access.exited_at ? ` · saida ${formatDate(access.exited_at)}` : ""}
                </span>
              </div>
            </article>
          ))}
          {validations.slice(0, 6).map((validation) => (
            <article className="list-row" key={validation.id}>
              <div>
                <strong>{validation.result}</strong>
                <span>
                  {validation.reason ?? "Validacao registrada"} · {formatDate(validation.created_at)}
                </span>
              </div>
            </article>
          ))}
          {vehicleAccesses.length === 0 && validations.length === 0 ? (
            <p className="muted compact">Nenhum acesso registrado ainda.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
