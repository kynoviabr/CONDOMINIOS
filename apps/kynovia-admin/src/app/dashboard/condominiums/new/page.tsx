import Link from "next/link";
import { KynoviaAdminShell } from "../../_components/KynoviaAdminShell";
import { createCondominiumWithAdminAction } from "../actions";
import { ClientRegistrationFields, RequiredLabel } from "../ClientRegistrationFields";
import { ContractMetadataFields } from "../ContractMetadataFields";
import { PhoneInput } from "../PhoneInput";
import { requireAuthorizedProfile } from "../../../../lib/auth/session";

type SearchParams = Promise<{
  error?: string;
  status?: string;
}>;

export const dynamic = "force-dynamic";

function statusMessage(status?: string) {
  if (status === "admin_created_email_sent") {
    return "Cliente cadastrado, administrador criado e e-mail enviado.";
  }

  if (status === "admin_created_email_not_configured") {
    return "Cliente cadastrado. Configure EMAIL_PROVIDER=resend, EMAIL_FROM e RESEND_API_KEY para enviar credenciais automaticamente.";
  }

  if (status === "admin_created_email_failed") {
    return "Cliente cadastrado, mas o envio do e-mail falhou. Confira o provedor de e-mail.";
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
    insufficient_role: "Seu perfil não possui permissão para criar clientes.",
    invalid_admin_credentials: "Informe nome, e-mail e WhatsApp válidos para o administrador.",
    invalid_client_fields: "Revise CNPJ, e-mail, telefones, CEP, UF, contrato, valor mensal e timezone.",
    missing_admin_fields: "Informe nome, e-mail e WhatsApp do administrador.",
    missing_condominium_fields: "Informe nome fantasia e slug válidos.",
    service_role_missing: "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para criar usuários de clientes."
  };

  return error ? messages[error] ?? `Não foi possível concluir: ${error}` : null;
}

export default async function NewCondominiumPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireAuthorizedProfile();
  const params = await searchParams;
  const success = statusMessage(params.status);
  const failure = errorMessage(params.error);

  return (
    <KynoviaAdminShell
      active="customers"
      title="Novo Cliente"
      description="Cadastro comercial do cliente e provisionamento do primeiro administrador do Condo Admin."
      profile={profile}
    >
      <div className="page-actions">
        <Link className="button-link secondary" href="/dashboard/condominiums">
          Voltar para clientes
        </Link>
      </div>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}

      <form className="admin-form customer-form" action={createCondominiumWithAdminAction}>
        <section className="admin-section">
          <h2>Dados Gerais</h2>
          <p className="muted">
            CNPJ e dados comerciais identificam o cliente Kynovia. O CNPJ e o slug sao chaves de
            negocio obrigatorias.
          </p>
          <label>
            <RequiredLabel>Slug</RequiredLabel>
            <input name="slug" required placeholder="residencial-aurora" />
          </label>
          <ClientRegistrationFields showContractFields={false} />
        </section>

        <section className="admin-section">
          <h2>Dados do Contrato</h2>
          <p className="muted">
            Informações comerciais usadas pelo dashboard SaaS. Upload real de documentos permanece
            como etapa futura segura.
          </p>
          <ContractMetadataFields />
        </section>

        <section className="admin-section">
          <h2>Administrador do Sistema</h2>
          <p className="muted">
            Este usuário recebera o acesso ao Condo Admin para administrar apenas o próprio
            condomínio.
          </p>
          <div className="form-row split-row">
            <label>
              <RequiredLabel>Nome completo</RequiredLabel>
              <input name="admin_full_name" required placeholder="Mariana Oliveira" />
            </label>
            <label>
              <RequiredLabel>E-mail</RequiredLabel>
              <input name="admin_email" type="email" required placeholder="admin@cliente.com.br" />
            </label>
          </div>
          <label>
            <RequiredLabel>WhatsApp</RequiredLabel>
            <PhoneInput name="admin_whatsapp" required />
          </label>
        </section>

        <button type="submit">Cadastrar cliente</button>
      </form>
    </KynoviaAdminShell>
  );
}
