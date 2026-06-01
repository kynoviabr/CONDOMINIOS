import { ContractUploadField } from "./ContractUploadField";
import { RequiredLabel } from "./ClientRegistrationFields";

type ContractMetadataFieldsProps = {
  documentsStatus?: string;
  expiresAt?: string;
  monthlyValue?: number | string | null;
  number?: string;
};

export function ContractMetadataFields({
  documentsStatus = "pending",
  expiresAt = "",
  monthlyValue = "",
  number = ""
}: ContractMetadataFieldsProps) {
  return (
    <>
      <div className="form-row split-row">
        <label>
          <RequiredLabel>Número do contrato</RequiredLabel>
          <input name="contract_number" required defaultValue={number} />
        </label>
        <label>
          <RequiredLabel>Data de vencimento do contrato</RequiredLabel>
          <input name="contract_expires_at" type="date" required defaultValue={expiresAt} />
        </label>
      </div>
      <div className="form-row split-row">
        <label>
          <RequiredLabel>Valor mensal</RequiredLabel>
          <input
            name="contract_monthly_value"
            required
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={typeof monthlyValue === "number" ? monthlyValue.toLocaleString("pt-BR") : monthlyValue ?? ""}
          />
        </label>
        <label>
          Documentos
          <select name="contract_documents_status" defaultValue={documentsStatus}>
            <option value="pending">Placeholder seguro: documentos pendentes</option>
            <option value="received">Documentos recebidos fora do sistema</option>
            <option value="not_required">Não aplicavel nesta etapa</option>
          </select>
        </label>
      </div>
      <ContractUploadField />
    </>
  );
}
