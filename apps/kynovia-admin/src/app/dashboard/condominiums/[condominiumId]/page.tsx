import Link from "next/link";
import { KynoviaAdminShell } from "../../_components/KynoviaAdminShell";
import { ClientRegistrationFields, RequiredLabel } from "../ClientRegistrationFields";
import { ContractMetadataFields } from "../ContractMetadataFields";
import { ScrollToTopOnStatus } from "../ScrollToTopOnStatus";
import { ScrollToTopSubmitButton } from "../ScrollToTopSubmitButton";
import { requireAuthorizedProfile } from "../../../../lib/auth/session";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { clientFromMetadata } from "../../../../lib/customers/metadata";
import { updateCondominiumClientAction } from "../actions";

type PageParams = Promise<{ condominiumId: string }>;
type SearchParams = Promise<{ error?: string; status?: string }>;

export const dynamic = "force-dynamic";

function statusMessage(status?: string) {
  if (status === "client_updated") {
    return "Dados cadastrais do cliente atualizados.";
  }

  return status ? `Operação concluída: ${status}` : null;
}

function errorMessage(error?: string) {
  const messages: Record<string, string> = {
    condominium_not_found: "Condomínio não encontrado.",
    duplicate_cnpj: "Já existe um condomínio cliente cadastrado com este CNPJ.",
    invalid_client_fields: "Revise CNPJ, e-mail, telefones, CEP, UF, contrato, valor mensal e timezone.",
    missing_condominium_fields: "Informe nome e slug válido para o condomínio.",
    update_condominium_failed: "Não foi possível atualizar os dados do cliente."
  };

  return error ? messages[error] ?? `Não foi possível concluir: ${error}` : null;
}

export default async function CondominiumDetailPage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const profile = await requireAuthorizedProfile();
  const { condominiumId } = await params;
  const query = await searchParams;
  const supabase = await createServerSupabaseClient();

  const { data: condominium, error: condominiumError } = await supabase
    .from("condominiums")
    .select("id, tenant_id, name, slug, timezone, visitor_parking_capacity, metadata, created_at")
    .eq("id", condominiumId)
    .eq("tenant_id", profile.tenantId)
    .single();

  if (condominiumError || !condominium) {
    return (
      <main className="admin-shell">
        <p className="eyebrow">Kynovia Condo Admin</p>
        <h1>Condomínio não encontrado</h1>
        <Link className="button-link secondary" href="/dashboard/condominiums">
          Voltar
        </Link>
      </main>
    );
  }

  const client = clientFromMetadata(condominium.metadata);
  const address = client.address ?? {};
  const contract = client.contract ?? {};
  const success = statusMessage(query.status);
  const failure = errorMessage(query.error);

  return (
    <KynoviaAdminShell
      active="customers"
      title={client.trade_name || condominium.name}
      description="Dados comerciais do cliente. Configurações operacionais continuam no Condo Admin."
      profile={profile}
    >
      <ScrollToTopOnStatus />
      <div className="page-actions">
        <Link className="button-link secondary" href="/dashboard/users">
          Gerenciar usuários
        </Link>
        <Link className="button-link secondary" href="/dashboard/condominiums">
          Voltar para clientes
        </Link>
      </div>

      {success ? <p className="form-success">{success}</p> : null}
      {failure ? <p className="form-error">{failure}</p> : null}

      <form className="admin-form customer-form" action={updateCondominiumClientAction}>
        <input name="condominium_id" type="hidden" value={condominium.id} />
        <section className="admin-section">
          <h2>Dados Gerais</h2>
          <label>
            <RequiredLabel>Slug</RequiredLabel>
            <input name="slug" required defaultValue={condominium.slug} />
          </label>
          <ClientRegistrationFields
            addressCity={address.city ?? ""}
            addressComplement={address.complement ?? ""}
            addressLine={address.line ?? ""}
            addressNumber={address.number ?? ""}
            addressPostalCode={address.postal_code ?? ""}
            addressState={address.state ?? ""}
            clientCnpj={client.cnpj ?? ""}
            clientEmail={client.email ?? ""}
            clientPhone={client.phone ?? ""}
            clientWhatsapp={client.whatsapp ?? client.phone ?? ""}
            contact1Name={client.contact_1?.name ?? ""}
            contact1Whatsapp={client.contact_1?.whatsapp ?? ""}
            contact2Name={client.contact_2?.name ?? ""}
            contact2Whatsapp={client.contact_2?.whatsapp ?? ""}
            legalName={client.legal_name ?? ""}
            showContractFields={false}
            timezone={condominium.timezone}
            tradeName={client.trade_name ?? condominium.name}
          />
        </section>

        <section className="admin-section">
          <h2>Dados do Contrato</h2>
          <ContractMetadataFields
            documentsStatus={contract.documents_status ?? "pending"}
            expiresAt={contract.expires_at ?? ""}
            monthlyValue={contract.monthly_value ?? ""}
            number={contract.number ?? ""}
          />
        </section>

        <ScrollToTopSubmitButton>Salvar dados do cliente</ScrollToTopSubmitButton>
      </form>
    </KynoviaAdminShell>
  );
}
