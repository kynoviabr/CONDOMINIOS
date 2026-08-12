"use client";

import { useState } from "react";
import { normalizePhoneFormat, onlyDigits } from "../../../lib/customers/metadata";

type PhoneInputProps = {
  defaultValue?: string | null;
  name: string;
  required?: boolean;
};

function formatPhone(value: string) {
  const normalized = normalizePhoneFormat(value);

  if (/^\(\d{2}\) \d{5}-\d{4}$/.test(normalized)) {
    return normalized;
  }

  const digits = onlyDigits(value).replace(/^55(?=\d{11}$)/, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 7) {
    return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  }

  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

export function PhoneInput({ defaultValue = "", name, required = false }: PhoneInputProps) {
  const [value, setValue] = useState(formatPhone(defaultValue ?? ""));

  return (
    <input
      name={name}
      required={required}
      inputMode="tel"
      placeholder="(XX) XXXXX-XXXX"
      title="Digite DDD e numero; o sistema formata automaticamente."
      value={value}
      onBlur={(event) => setValue(normalizePhoneFormat(event.target.value))}
      onChange={(event) => setValue(formatPhone(event.target.value))}
    />
  );
}
