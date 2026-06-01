"use client";

import { useEffect, useState } from "react";
import { isValidCnpj, onlyDigits } from "../../../lib/customers/metadata";
import { PhoneInput } from "./PhoneInput";
import { brazilStates, brazilTimezones, timezoneByState } from "./form-options";

type ClientRegistrationFieldsProps = {
  addressCity?: string;
  addressComplement?: string;
  addressLine?: string;
  addressNumber?: string;
  addressPostalCode?: string;
  addressState?: string;
  clientCnpj?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  contact1Name?: string;
  contact1Whatsapp?: string;
  contact2Name?: string;
  contact2Whatsapp?: string;
  contractDocumentsStatus?: string;
  contractExpiresAt?: string;
  contractMonthlyValue?: number | string;
  contractNumber?: string;
  legalName?: string;
  showContractFields?: boolean;
  tradeName?: string;
  timezone?: string;
};

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCep(value: string) {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

export function RequiredLabel({ children }: { children: string }) {
  return (
    <span>
      <span aria-hidden="true">*</span> {children}
    </span>
  );
}

export function ClientRegistrationFields({
  addressCity = "",
  addressComplement = "",
  addressLine = "",
  addressNumber = "",
  addressPostalCode = "",
  addressState = "",
  clientCnpj = "",
  clientEmail = "",
  clientPhone = "",
  clientWhatsapp = "",
  contact1Name = "",
  contact1Whatsapp = "",
  contact2Name = "",
  contact2Whatsapp = "",
  contractDocumentsStatus = "pending",
  contractExpiresAt = "",
  contractMonthlyValue = "",
  contractNumber = "",
  legalName = "",
  showContractFields = true,
  tradeName = "",
  timezone = "America/Sao_Paulo"
}: ClientRegistrationFieldsProps) {
  const [uf, setUf] = useState(addressState);
  const [timezoneValue, setTimezoneValue] = useState(timezone);
  const [cnpj, setCnpj] = useState(formatCnpj(clientCnpj));
  const [cnpjError, setCnpjError] = useState("");
  const [cep, setCep] = useState(formatCep(addressPostalCode));
  const [address, setAddress] = useState(addressLine);
  const [city, setCity] = useState(addressCity);

  useEffect(() => {
    if (uf && uf in timezoneByState) {
      setTimezoneValue(timezoneByState[uf as keyof typeof timezoneByState]);
    }
  }, [uf]);

  useEffect(() => {
    const digits = onlyDigits(cep);

    if (digits.length !== 8) {
      return;
    }

    const controller = new AbortController();

    async function fillAddressFromCep() {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
          signal: controller.signal
        });
        const data = (await response.json()) as {
          erro?: boolean;
          localidade?: string;
          logradouro?: string;
          uf?: string;
        };

        if (data.erro) {
          return;
        }

        if (data.logradouro) {
          setAddress(data.logradouro);
        }

        if (data.localidade) {
          setCity(data.localidade);
        }

        if (data.uf && brazilStates.includes(data.uf as (typeof brazilStates)[number])) {
          setUf(data.uf);
        }

        window.setTimeout(() => {
          document.querySelector<HTMLInputElement>('input[name="address_number"]')?.focus();
        }, 0);
      } catch {
        // CEP lookup is a convenience; manual entry remains available.
      }
    }

    void fillAddressFromCep();

    return () => controller.abort();
  }, [cep]);

  return (
    <>
      <div className="form-row split-row">
        <label>
          <RequiredLabel>Razão Social</RequiredLabel>
          <input name="legal_name" required defaultValue={legalName} placeholder="Condomínio Aurora SPE Ltda." />
        </label>
        <label>
          <RequiredLabel>Nome Fantasia</RequiredLabel>
          <input name="trade_name" required defaultValue={tradeName} placeholder="Residencial Aurora" />
        </label>
      </div>
      <div className="form-row email-phone-row">
        <label>
          <RequiredLabel>E-mail</RequiredLabel>
          <input name="client_email" type="email" required defaultValue={clientEmail} />
        </label>
        <label>
          <RequiredLabel>Telefone</RequiredLabel>
          <PhoneInput name="client_phone" required defaultValue={clientPhone} />
        </label>
        <label>
          <RequiredLabel>WhatsApp</RequiredLabel>
          <PhoneInput name="client_whatsapp" required defaultValue={clientWhatsapp} />
        </label>
      </div>
      <div className="form-row cnpj-cep-row">
        <label>
          <RequiredLabel>CNPJ</RequiredLabel>
          <input
            name="client_cnpj"
            required
            inputMode="numeric"
            pattern="\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"
            placeholder="00.000.000/0000-00"
            title="Use o formato 00.000.000/0000-00"
            value={cnpj}
            onBlur={(event) => {
              const isComplete = onlyDigits(event.target.value).length === 14;
              const isValid = !isComplete || isValidCnpj(event.target.value);
              event.target.setCustomValidity(isValid ? "" : "Informe um CNPJ válido.");
              setCnpjError(isValid ? "" : "CNPJ inválido.");
            }}
            onChange={(event) => {
              const formatted = formatCnpj(event.target.value);
              setCnpj(formatted);
              event.target.setCustomValidity("");
              setCnpjError("");
            }}
          />
          {cnpjError ? <small className="field-error">{cnpjError}</small> : null}
        </label>
        <label>
          <RequiredLabel>CEP</RequiredLabel>
          <input
            name="address_postal_code"
            required
            inputMode="numeric"
            pattern="\d{5}-\d{3}"
            placeholder="XXXXX-XXX"
            title="Use o formato XXXXX-XXX"
            value={cep}
            onChange={(event) => setCep(formatCep(event.target.value))}
          />
        </label>
      </div>
      <label>
        <RequiredLabel>Timezone</RequiredLabel>
        <select name="timezone" required value={timezoneValue} onChange={(event) => setTimezoneValue(event.target.value)}>
          {brazilTimezones.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label>
        <RequiredLabel>Endereço completo</RequiredLabel>
        <input
          name="address_line"
          required
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </label>
      <div className="form-row address-number-row">
        <label>
          <RequiredLabel>Número</RequiredLabel>
          <input name="address_number" required defaultValue={addressNumber} />
        </label>
        <label>
          Complemento
          <input name="address_complement" defaultValue={addressComplement} />
        </label>
      </div>
      <div className="form-row compact-address-row">
        <label>
          <RequiredLabel>Cidade</RequiredLabel>
          <input
            name="address_city"
            required
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </label>
        <label>
          <RequiredLabel>UF</RequiredLabel>
          <select name="address_state" required value={uf} onChange={(event) => setUf(event.target.value)}>
            <option value="">UF</option>
            {brazilStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row split-row">
        <label>
          <RequiredLabel>Nome do contato 1</RequiredLabel>
          <input name="contact_1_name" required defaultValue={contact1Name} />
        </label>
        <label>
          <RequiredLabel>WhatsApp do contato 1</RequiredLabel>
          <PhoneInput name="contact_1_whatsapp" required defaultValue={contact1Whatsapp} />
        </label>
      </div>
      <div className="form-row split-row">
        <label>
          Nome do contato 2
          <input name="contact_2_name" defaultValue={contact2Name} />
        </label>
        <label>
          WhatsApp do contato 2
          <PhoneInput name="contact_2_whatsapp" defaultValue={contact2Whatsapp} />
        </label>
      </div>
      {showContractFields ? (
        <div className="contract-fields">
          <div className="form-row split-row">
            <label>
              <RequiredLabel>Número do contrato</RequiredLabel>
              <input name="contract_number" required defaultValue={contractNumber} />
            </label>
            <label>
              <RequiredLabel>Data de vencimento do contrato</RequiredLabel>
              <input name="contract_expires_at" type="date" required defaultValue={contractExpiresAt} />
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
                defaultValue={String(contractMonthlyValue ?? "")}
              />
            </label>
            <label>
              Documentos
              <select name="contract_documents_status" defaultValue={contractDocumentsStatus}>
                <option value="pending">Placeholder seguro: documentos pendentes</option>
                <option value="received">Documentos recebidos fora do sistema</option>
                <option value="not_required">Não aplicavel nesta etapa</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}
    </>
  );
}
