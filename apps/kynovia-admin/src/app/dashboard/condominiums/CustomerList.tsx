"use client";

import Link from "next/link";
import { useState } from "react";

export type CustomerListItem = {
  address: {
    city?: string | null;
    complement?: string | null;
    line?: string | null;
    number?: string | null;
    postalCode?: string | null;
    state?: string | null;
  };
  cnpj?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contract: {
    documentsStatus?: string | null;
    expiresAt?: string | null;
    monthlyValue?: number | null;
    number?: string | null;
  };
  email?: string | null;
  id: string;
  legalName?: string | null;
  phone?: string | null;
  slug: string;
  systemAdmin: {
    email?: string | null;
    fullName?: string | null;
    whatsapp?: string | null;
  };
  tradeName: string;
  whatsapp?: string | null;
};

function displayValue(value?: string | number | null) {
  return value || "-";
}

function currencyValue(value?: number | null) {
  return typeof value === "number"
    ? value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" })
    : "-";
}

function addressLine(customer: CustomerListItem) {
  const address = [
    customer.address.line,
    customer.address.number,
    customer.address.complement,
    customer.address.city,
    customer.address.state,
    customer.address.postalCode
  ].filter(Boolean);

  return address.length ? address.join(", ") : "-";
}

function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "C";
  const second = words.length > 1 ? words[1]?.[0] : words[0]?.[1];

  return `${first}${second ?? ""}`.toUpperCase();
}

export function CustomerList({ customers }: { customers: CustomerListItem[] }) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);

  if (!customers.length) {
    return (
      <section className="empty-state">
        <h2>Nenhum cliente cadastrado</h2>
        <p className="muted">Clique em Novo Cliente para iniciar o primeiro cadastro comercial.</p>
      </section>
    );
  }

  return (
    <section className="customer-list-section">
      <div className="section-heading">
        <div>
          <h2>Clientes do sistema</h2>
          <p className="muted">Dados principais dos clientes cadastrados na plataforma.</p>
        </div>
        <span>{customers.length} cliente{customers.length === 1 ? "" : "s"}</span>
      </div>

      <div className="customer-list" role="list">
        <div className="customer-list-header" aria-hidden="true">
          <span>Nome do Cliente (Fantasia)</span>
          <span>Nome do Contato</span>
          <span>Número do contato</span>
          <span>E-mail</span>
          <span />
        </div>
        {customers.map((customer) => (
          <button
            className="customer-list-row"
            key={customer.id}
            onClick={() => setSelectedCustomer(customer)}
            type="button"
          >
            <span className="customer-name-cell">
              <span aria-hidden="true" className="customer-avatar">
                {initials(customer.tradeName)}
              </span>
              <span className="customer-name">{customer.tradeName}</span>
            </span>
            <span className="customer-muted-cell">{displayValue(customer.contactName)}</span>
            <span className="customer-muted-cell">{displayValue(customer.contactPhone)}</span>
            <span className="customer-email-cell">{displayValue(customer.email)}</span>
            <span aria-hidden="true" className="row-arrow" />
          </button>
        ))}
      </div>

      {selectedCustomer ? (
        <div
          aria-labelledby="customer-modal-title"
          aria-modal="true"
          className="modal-backdrop"
          role="dialog"
        >
          <div className="customer-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Cliente</p>
                <h2 id="customer-modal-title">{selectedCustomer.tradeName}</h2>
              </div>
              <button
                aria-label="Fechar detalhes do cliente"
                className="icon-button"
                onClick={() => setSelectedCustomer(null)}
                type="button"
              >
                x
              </button>
            </div>

            <dl className="customer-detail-grid">
              <div>
                <dt>Razão social</dt>
                <dd>{displayValue(selectedCustomer.legalName)}</dd>
              </div>
              <div>
                <dt>CNPJ</dt>
                <dd>{displayValue(selectedCustomer.cnpj)}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{displayValue(selectedCustomer.email)}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{displayValue(selectedCustomer.phone)}</dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd>{displayValue(selectedCustomer.whatsapp)}</dd>
              </div>
              <div>
                <dt>Contato principal</dt>
                <dd>
                  {displayValue(selectedCustomer.contactName)} |{" "}
                  {displayValue(selectedCustomer.contactPhone)}
                </dd>
              </div>
              <div>
                <dt>Administrador</dt>
                <dd>
                  {displayValue(selectedCustomer.systemAdmin.fullName)} |{" "}
                  {displayValue(selectedCustomer.systemAdmin.email)} |{" "}
                  {displayValue(selectedCustomer.systemAdmin.whatsapp)}
                </dd>
              </div>
              <div>
                <dt>Endereço</dt>
                <dd>{addressLine(selectedCustomer)}</dd>
              </div>
              <div>
                <dt>Contrato</dt>
                <dd>
                  {displayValue(selectedCustomer.contract.number)} | vencimento{" "}
                  {displayValue(selectedCustomer.contract.expiresAt)} |{" "}
                  {currencyValue(selectedCustomer.contract.monthlyValue)}
                </dd>
              </div>
              <div>
                <dt>Status dos documentos</dt>
                <dd>{displayValue(selectedCustomer.contract.documentsStatus)}</dd>
              </div>
            </dl>

            <div className="modal-actions">
              <Link className="button-link secondary" href={`/dashboard/condominiums/${selectedCustomer.id}`}>
                Abrir ficha completa
              </Link>
              <button onClick={() => setSelectedCustomer(null)} type="button">
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
