import Link from "next/link";
import { KynoviaAdminShell } from "../_components/KynoviaAdminShell";
import { CondominiumSelector } from "./CondominiumSelector";
import { CustomerList, type CustomerListItem } from "./CustomerList";
import { requireAuthorizedProfile } from "../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { clientFromMetadata } from "../../../lib/customers/metadata";

type SearchParams = Promise<{
  error?: string;
  status?: string;
}>;

type CondominiumSummary = {
  id: string;
  metadata: unknown;
  name: string;
  slug: string;
};

export const dynamic = "force-dynamic";

function statusMessage(status?: string) {
  if (status === "condominium_created" || status === "admin_created_email_sent") {
    return "Cliente cadastrado e acesso administrativo provisionado.";
  }

  if (status === "admin_created_email_not_configured") {
    return "Cliente cadastrado. Configure o provedor de e-mail para enviar credenciais automaticamente.";
  }

  if (status === "admin_created_email_failed") {
    return "Cliente cadastrado, mas o envio do e-mail falhou. Confira a configuracao do provedor.";
  }

  return status ? `Operação concluída: ${status}` : null;
}

function errorMessage(error?: string) {
  const messages: Record<string, string> = {
    create_admin_auth_failed: "Não foi possível criar o usuário de acesso. Verifique se o e-mail já existe.",
    create_admin_membership_failed: "Perfil criado, mas não foi possível vincular o administrador ao cliente.",
    create_admin_profile_failed: "Usuário criado, mas não foi possível criar o perfil do administrador.",
    create_condominium_failed: "Não foi possível criar o cliente.",
    duplicate_cnpj: "Já existe um cliente cadastrado com este CNPJ.",
    insufficient_role: "Seu perfil não possui permissão para gerenciar clientes.",
    invalid_admin_credentials: "Informe nome, e-mail e WhatsApp válidos para o administrador.",
    invalid_client_fields: "Revise CNPJ, e-mail, telefones, CEP, UF, contrato, valor mensal e timezone.",
    missing_admin_fields: "Informe os dados obrigatórios do administrador.",
    missing_condominium_fields: "Informe nome fantasia e slug válidos.",
    service_role_missing: "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para criar usuários de clientes."
  };

  return error ? messages[error] ?? `Não foi possível concluir: ${error}` : null;
}

export default async function CondominiumsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireAuthorizedProfile();
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: condominiums, error } = await supabase
    .from("condominiums")
    .select("id, name, slug, metadata")
    .eq("tenant_id", profile.tenantId)
    .order("name", { ascending: true });

  const customerOptions = ((condominiums ?? []) as CondominiumSummary[]).map((condominium) => {
    const client = clientFromMetadata(condominium.metadata);

    return {
      cnpj: client.cnpj ?? null,
      id: condominium.id,
      legalName: client.legal_name ?? null,
      name: condominium.name,
      slug: condominium.slug,
      tradeName: client.trade_name ?? condominium.name
    };
  });
  const customers: CustomerListItem[] = ((condominiums ?? []) as CondominiumSummary[]).map(
    (condominium) => {
      const client = clientFromMetadata(condominium.metadata);

      return {
        address: {
          city: client.address?.city ?? null,
          complement: client.address?.complement ?? null,
          line: client.address?.line ?? null,
          number: client.address?.number ?? null,
          postalCode: client.address?.postal_code ?? null,
          state: client.address?.state ?? null
        },
        cnpj: client.cnpj ?? null,
        contactName: client.contact_1?.name ?? client.system_admin?.full_name ?? null,
        contactPhone: client.contact_1?.whatsapp ?? client.whatsapp ?? client.phone ?? null,
        contract: {
          documentsStatus: client.contract?.documents_status ?? null,
          expiresAt: client.contract?.expires_at ?? null,
          monthlyValue: client.contract?.monthly_value ?? null,
          number: client.contract?.number ?? null
        },
        email: client.email ?? null,
        id: condominium.id,
        legalName: client.legal_name ?? null,
        phone: client.phone ?? null,
        slug: condominium.slug,
        systemAdmin: {
          email: client.system_admin?.email ?? null,
          fullName: client.system_admin?.full_name ?? null,
          whatsapp: client.system_admin?.whatsapp ?? null
        },
        tradeName: client.trade_name ?? condominium.name,
        whatsapp: client.whatsapp ?? null
      };
    }
  );
  const success = statusMessage(params.status);
  const failure = errorMessage(params.error);

  return (
    <KynoviaAdminShell
      active="customers"
      title="Gestão de Clientes"
      description="Selecione rapidamente um cliente existente ou inicie um novo cadastro comercial."
      profile={profile}
    >
      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}
      {error ? <p className="form-error">Falha ao carregar clientes.</p> : null}

      <section className="customer-toolbar">
        <CondominiumSelector condominiums={customerOptions} />
        <Link className="button-link" href="/dashboard/condominiums/new">
          Novo Cliente
        </Link>
      </section>

      <CustomerList customers={customers} />
    </KynoviaAdminShell>
  );
}
