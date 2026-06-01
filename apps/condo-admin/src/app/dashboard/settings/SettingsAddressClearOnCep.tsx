"use client";

import { useEffect, useRef } from "react";

const addressFieldNames = ["fullAddress", "number", "complement", "city", "state"];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function SettingsAddressClearOnCep() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = markerRef.current?.closest("form");
    const postalCodeInput = form?.querySelector<HTMLInputElement>('input[name="postalCode"]');

    if (!form || !postalCodeInput) {
      return;
    }

    const clearAddressFields = () => {
      if (onlyDigits(postalCodeInput.value).length > 0) {
        return;
      }

      for (const fieldName of addressFieldNames) {
        const field = form.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);

        if (field) {
          field.value = "";
        }
      }
    };

    postalCodeInput.addEventListener("input", clearAddressFields);

    return () => {
      postalCodeInput.removeEventListener("input", clearAddressFields);
    };
  }, []);

  return <span aria-hidden="true" ref={markerRef} hidden />;
}
