import { KynoviaAdminShell } from "../_components/KynoviaAdminShell";
import { UsersManagement } from "./UsersManagement";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { clientFromMetadata } from "../../../lib/customers/metadata";

type SearchParams = Promise<{ error?: string; status?: string }>;

type CondominiumOption = {
  id: string;
  metadata: unknown;
  name: string;
};

type MembershipRow = {
  condominium_id: string;
  created_at: string;
  id: string;
  profile_id: string;
};

type AdminUser = MembershipRow & {
  accessScope: "client_admin";
  condominiumName: string;
  email: string;
  fullName: string;
  whatsapp: string | null;
};

type PlatformAdminUser = {
  accessScope: "platform_admin";
  condominium_id: string | null;
  condominiumName: string;
  created_at: string;
  email: string;
  fullName: string;
  id: string;
  profile_id: string;
  whatsapp: string | null;
};

export const dynamic = "force-dynamic";

function statusMessage(status?: string) {
  if (status === "admin_created" || status === "admin_created_email_sent") {
    return "Usuário criado e e-mail enviado.";
  }

  if (status === "admin_created_email_not_configured") {
    return "Usuário criado. Configure o provedor de e-mail para enviar credenciais automaticamente.";
  }

  if (status === "admin_created_email_failed") {
    return "Usuário criado, mas o envio do e-mail falhou.";
  }

  if (status === "admin_updated") {
    return "Usuário atualizado.";
  }

  if (status === "admin_removed") {
    return "Usuário removido do cliente.";
  }

  return status ? `Operação concluída: ${status}` : null;
}

function errorMessage(error?: string) {
  const messages: Record<string, string> = {
    admin_not_found: "Usuário não encontrado para este cliente.",
    condominium_not_found: "Cliente não encontrado.",
    create_admin_auth_failed: "Não foi possível criar o usuário. Verifique se o e-mail já existe.",
    create_admin_membership_failed: "Perfil criado, mas não foi possível vincular o usuário ao cliente.",
    create_admin_profile_failed: "Usuário criado, mas não foi possível criar o perfil.",
    invalid_admin_credentials: "Informe e-mail, WhatsApp e senha temporária válidos.",
    last_admin_removal_blocked: "Não é possível remover o último usuário administrador do cliente.",
    last_platform_admin_removal_blocked: "Não é possível remover o último administrador da Kynovia.",
    missing_admin_fields: "Informe todos os campos obrigatórios do usuário.",
    remove_admin_failed: "Não foi possível remover o usuário.",
    service_role_missing: "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para administrar acessos.",
    self_admin_removal_blocked: "Você não pode remover seu próprio acesso de administrador da Kynovia.",
    update_admin_auth_failed: "Não foi possível atualizar e-mail ou senha do usuário.",
    update_admin_failed: "Não foi possível atualizar o usuário."
  };

  return error ? messages[error] ?? `Não foi possível concluir: ${error}` : null;
}

async function getAdminAuthProfiles(profileIds: string[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return new Map<string, { email: string; whatsapp: string | null }>();
  }

  const entries = await Promise.all(
    profileIds.map(async (profileId) => {
      const response = await fetch(`${url}/auth/v1/admin/users/${profileId}`, {
        cache: "no-store",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        email?: string;
        user?: { email?: string; user_metadata?: { whatsapp?: string | null } };
        user_metadata?: { whatsapp?: string | null };
      };

      return [
        profileId,
        {
          email: data.email ?? data.user?.email ?? "",
          whatsapp: data.user_metadata?.whatsapp ?? data.user?.user_metadata?.whatsapp ?? null
        }
      ] as const;
    })
  );

  return new Map(
    entries.filter(
      (entry): entry is readonly [string, { email: string; whatsapp: string | null }] =>
        Boolean(entry)
    )
  );
}

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireAuthorizedProfile();
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();

  const { data: condominiumsData, error: condominiumsError } = await supabase
    .from("condominiums")
    .select("id, name, metadata")
    .eq("tenant_id", profile.tenantId)
    .order("name", { ascending: true });

  const condominiums = (condominiumsData ?? []) as CondominiumOption[];
  const condominiumNameById = new Map(
    condominiums.map((condominium) => {
      const client = clientFromMetadata(condominium.metadata);
      return [condominium.id, client.trade_name || condominium.name];
    })
  );

  const { data: membershipsData, error: membershipsError } = await supabase
    .from("condominium_memberships")
    .select("id, condominium_id, profile_id, created_at")
    .eq("tenant_id", profile.tenantId)
    .eq("role", "condominium_admin")
    .order("created_at", { ascending: false });

  const memberships = (membershipsData ?? []) as MembershipRow[];
  const { data: platformProfilesData } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("tenant_id", profile.tenantId)
    .eq("role", "platform_admin")
    .order("created_at", { ascending: false });
  const platformProfiles = platformProfilesData ?? [];
  const profileIds = Array.from(
    new Set([
      ...memberships.map((membership) => membership.profile_id),
      ...platformProfiles.map((platformProfile) => platformProfile.id)
    ])
  );
  const { data: profilesData } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] };
  const profilesById = new Map((profilesData ?? []).map((item) => [item.id, item.full_name]));
  const authById = await getAdminAuthProfiles(profileIds);
  const users: AdminUser[] = memberships.map((membership) => ({
    ...membership,
    accessScope: "client_admin",
    condominiumName: condominiumNameById.get(membership.condominium_id) ?? "Cliente não encontrado",
    email: authById.get(membership.profile_id)?.email ?? "",
    fullName: profilesById.get(membership.profile_id) ?? "Usuário sem perfil",
    whatsapp: authById.get(membership.profile_id)?.whatsapp ?? null
  }));
  const platformUsers: PlatformAdminUser[] = platformProfiles.map((platformProfile) => ({
    accessScope: "platform_admin",
    condominium_id: null,
    condominiumName: "Kynovia Admin",
    created_at: platformProfile.created_at,
    email: authById.get(platformProfile.id)?.email ?? "",
    fullName: profilesById.get(platformProfile.id) ?? platformProfile.full_name ?? "Usuário sem perfil",
    id: platformProfile.id,
    profile_id: platformProfile.id,
    whatsapp: authById.get(platformProfile.id)?.whatsapp ?? null
  }));
  const success = statusMessage(params.status);
  const failure = errorMessage(params.error);

  return (
    <KynoviaAdminShell
      active="users"
      title="Gestão de Usuários"
      description="Crie e mantenha usuários administradores dos clientes do Condo Admin."
      profile={profile}
    >
      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {condominiumsError || membershipsError ? (
        <p className="form-error">Falha ao carregar usuários.</p>
      ) : null}

      <UsersManagement
        condominiums={condominiums.map((condominium) => ({
          id: condominium.id,
          name: condominiumNameById.get(condominium.id) ?? condominium.name
        }))}
        users={[...platformUsers, ...users].map((user) => ({
          accessScope: user.accessScope,
          condominiumId: user.condominium_id,
          condominiumName: user.condominiumName,
          email: user.email,
          fullName: user.fullName,
          id: user.id,
          profileId: user.profile_id,
          whatsapp: user.whatsapp
        }))}
      />
    </KynoviaAdminShell>
  );
}
