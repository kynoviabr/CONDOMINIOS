"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatCep,
  formatCnpj,
  formatPhone,
  isValidCnpj,
  onlyDigits
} from "../../../lib/validation/brasil";
import type { ActiveCondominium } from "../../../lib/condominiums/context";
import { brazilStates, brazilTimezones, timezoneByState } from "./form-options";

type SettingsCondominiumFieldsProps = {
  condominium: ActiveCondominium;
};

function RequiredLabel({ children }: { children: string }) {
  return (
    <span>
      <span aria-hidden="true">*</span> {children}
    </span>
  );
}

export function SettingsCondominiumFields({ condominium }: SettingsCondominiumFieldsProps) {
  const numberInputRef = useRef<HTMLInputElement>(null);
  const [cnpj, setCnpj] = useState(formatCnpj(condominium.cnpj));
  const [cnpjError, setCnpjError] = useState("");
  const [postalCode, setPostalCode] = useState(formatCep(condominium.postalCode));
  const [fullAddress, setFullAddress] = useState(condominium.fullAddress);
  const [number, setNumber] = useState(condominium.number);
  const [complement, setComplement] = useState(condominium.complement);
  const [city, setCity] = useState(condominium.city);
  const [state, setState] = useState(condominium.state);
  const [phone, setPhone] = useState(formatPhone(condominium.phone));
  const [whatsapp, setWhatsapp] = useState(formatPhone(condominium.whatsapp));
  const [timezone, setTimezone] = useState(condominium.timezone || "America/Sao_Paulo");

  useEffect(() => {
    const digits = onlyDigits(postalCode);

    if (digits.length > 0) {
      return;
    }

    setFullAddress("");
    setNumber("");
    setComplement("");
    setCity("");
    setState("");
  }, [postalCode]);

  useEffect(() => {
    const digits = onlyDigits(postalCode);

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
          setFullAddress(data.logradouro);
        }

        if (data.localidade) {
          setCity(data.localidade);
        }

        if (data.uf && brazilStates.includes(data.uf as (typeof brazilStates)[number])) {
          setState(data.uf);
        }

        window.setTimeout(() => numberInputRef.current?.focus(), 50);
      } catch {
        // CEP lookup is a convenience; manual address entry remains available.
      }
    }

    void fillAddressFromCep();

    return () => controller.abort();
  }, [postalCode]);

  useEffect(() => {
    if (state && state in timezoneByState) {
      setTimezone(timezoneByState[state as keyof typeof timezoneByState]);
    }
  }, [state]);

  return (
    <>
      <label>
        <RequiredLabel>Nome do condominio</RequiredLabel>
        <input name="name" defaultValue={condominium.name} required />
      </label>
      <label>
        <RequiredLabel>CNPJ</RequiredLabel>
        <input
          name="cnpj"
          required
          inputMode="numeric"
          pattern="\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"
          placeholder="00.000.000/0000-00"
          title="Use um CNPJ valido no formato 00.000.000/0000-00"
          value={cnpj}
          onBlur={(event) => {
            const isComplete = onlyDigits(event.target.value).length === 14;
            const isValid = !isComplete || isValidCnpj(event.target.value);
            event.target.setCustomValidity(isValid ? "" : "Informe um CNPJ valido.");
            setCnpjError(isValid ? "" : "CNPJ invalido.");
          }}
          onChange={(event) => {
            setCnpj(formatCnpj(event.target.value));
            event.target.setCustomValidity("");
            setCnpjError("");
          }}
        />
        {cnpjError ? <small className="field-error">{cnpjError}</small> : null}
      </label>
      <label>
        <RequiredLabel>CEP</RequiredLabel>
        <input
          name="postalCode"
          required
          inputMode="numeric"
          pattern="\d{5}-\d{3}"
          placeholder="00000-000"
          title="Use o formato 00000-000"
          value={postalCode}
          onChange={(event) => setPostalCode(formatCep(event.target.value))}
        />
      </label>
      <label>
        <RequiredLabel>Endereco completo</RequiredLabel>
        <input
          name="fullAddress"
          required
          placeholder="Rua, avenida ou alameda"
          value={fullAddress}
          onChange={(event) => setFullAddress(event.target.value)}
        />
      </label>
      <div className="form-row settings-paired-row">
        <label>
          <RequiredLabel>Numero</RequiredLabel>
          <input
            name="number"
            ref={numberInputRef}
            required
            value={number}
            onChange={(event) => setNumber(event.target.value)}
          />
        </label>
        <label>
          Complemento
          <input
            name="complement"
            value={complement}
            onChange={(event) => setComplement(event.target.value)}
          />
        </label>
      </div>
      <div className="form-row split">
        <label>
          <RequiredLabel>Cidade</RequiredLabel>
          <input name="city" required value={city} onChange={(event) => setCity(event.target.value)} />
        </label>
        <label>
          <RequiredLabel>UF</RequiredLabel>
          <select name="state" required value={state} onChange={(event) => setState(event.target.value)}>
            <option value="" disabled>
              UF
            </option>
            {brazilStates.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row split">
        <label>
          <RequiredLabel>Telefone</RequiredLabel>
          <input
            name="phone"
            required
            inputMode="tel"
            pattern="\(\d{2}\) \d{5}-\d{4}"
            placeholder="(11) 99999-9999"
            title="Use o formato (XX) XXXXX-XXXX"
            value={phone}
            onChange={(event) => setPhone(formatPhone(event.target.value))}
          />
        </label>
        <label>
          <RequiredLabel>WhatsApp</RequiredLabel>
          <input
            name="whatsapp"
            required
            inputMode="tel"
            pattern="\(\d{2}\) \d{5}-\d{4}"
            placeholder="(11) 99999-9999"
            title="Use o formato (XX) XXXXX-XXXX"
            value={whatsapp}
            onChange={(event) => setWhatsapp(formatPhone(event.target.value))}
          />
        </label>
      </div>
      <label>
        <RequiredLabel>E-mail</RequiredLabel>
        <input name="email" type="email" required defaultValue={condominium.email} />
      </label>
      <label>
        Slug
        <input value={condominium.slug} readOnly aria-readonly="true" />
      </label>
      <label>
        <RequiredLabel>Timezone</RequiredLabel>
        <select name="timezone" required value={timezone} onChange={(event) => setTimezone(event.target.value)}>
          {brazilTimezones.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row split">
        <label>
          <RequiredLabel>Tipo de condominio</RequiredLabel>
          <select name="unitRegistrationMode" defaultValue={condominium.unitRegistrationMode ?? ""} required>
            <option value="" disabled>
              Selecione
            </option>
            <option value="vertical">Condominio vertical</option>
            <option value="horizontal">Condominio horizontal</option>
          </select>
        </label>
        <label>
          <RequiredLabel>Numero de vagas</RequiredLabel>
          <input
            min="0"
            name="visitorParkingCapacity"
            required
            type="number"
            defaultValue={condominium.visitorParkingCapacity}
          />
        </label>
      </div>
    </>
  );
}
