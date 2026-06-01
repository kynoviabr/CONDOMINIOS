export type CustomerAddress = {
  city?: string | null;
  complement?: string | null;
  line?: string | null;
  number?: string | null;
  postal_code?: string | null;
  state?: string | null;
};

export type CustomerContact = {
  name?: string | null;
  whatsapp?: string | null;
};

export type CustomerContract = {
  documents_status?: string | null;
  expires_at?: string | null;
  monthly_value?: number | null;
  number?: string | null;
};

export type CustomerSystemAdmin = {
  email?: string | null;
  full_name?: string | null;
  whatsapp?: string | null;
};

export type CustomerMetadata = {
  address?: CustomerAddress | null;
  cnpj?: string | null;
  contact_1?: CustomerContact | null;
  contact_2?: CustomerContact | null;
  contract?: CustomerContract | null;
  email?: string | null;
  legal_name?: string | null;
  phone?: string | null;
  system_admin?: CustomerSystemAdmin | null;
  trade_name?: string | null;
  whatsapp?: string | null;
};

export type FinanceMetadata = {
  access_status?: string | null;
  billing_status?: string | null;
  blocked?: boolean | null;
  blocked_reason?: string | null;
  inactive_reason?: string | null;
  payments?: Array<{
    amount?: number | null;
    paid_at?: string | null;
  }>;
};

export type CondominiumMetadata = {
  client?: CustomerMetadata | null;
  finance?: FinanceMetadata | null;
  [key: string]: unknown;
};

export const forbiddenKynoviaAdminOperationalModules = [
  "moradores",
  "visitantes",
  "veiculos",
  "funcionarios",
  "prestadores",
  "portaria",
  "ocorrências"
] as const;

export const kynoviaAdminNavigation = [
  { href: "/dashboard", key: "dashboard", label: "Dashboard" },
  { href: "/dashboard/condominiums", key: "customers", label: "Gestão de Clientes" },
  { href: "/dashboard/users", key: "users", label: "Gestão de Usuários" },
  { href: "/dashboard/finance", key: "finance", label: "Financeiro" }
] as const;

export function metadataObject(value: unknown): CondominiumMetadata {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as CondominiumMetadata)
    : {};
}

export function clientFromMetadata(value: unknown): CustomerMetadata {
  return metadataObject(value).client ?? {};
}

export function financeFromMetadata(value: unknown): FinanceMetadata {
  return metadataObject(value).finance ?? {};
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCnpj(value: string) {
  const digits = onlyDigits(value);

  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const calculateDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + Number(base[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return firstDigit === Number(digits[12]) && secondDigit === Number(digits[13]);
}

export function isValidCnpjFormat(value: string) {
  return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value) && isValidCnpj(value);
}

export function isValidPhoneFormat(value: string) {
  return /^\(\d{2}\) \d{5}-\d{4}$/.test(value);
}

export function normalizePhoneFormat(value: string) {
  let digits = onlyDigits(value);

  if (digits.length === 13 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.length !== 11) {
    return value.trim();
  }

  return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
}

export function isValidCepFormat(value: string) {
  return /^\d{5}-\d{3}$/.test(value);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function moneyValue(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

export function isInactiveClient(finance: FinanceMetadata) {
  return finance.blocked === true || finance.access_status === "inactive" || finance.billing_status === "overdue";
}

export function paymentTotal(finance: FinanceMetadata) {
  return (finance.payments ?? []).reduce(
    (total, payment) => total + (typeof payment.amount === "number" ? payment.amount : 0),
    0
  );
}

export function monthlyValue(client: CustomerMetadata) {
  return typeof client.contract?.monthly_value === "number" ? client.contract.monthly_value : 0;
}

export function contractExpiresWithinDays(client: CustomerMetadata, days: number, now = new Date()) {
  if (!client.contract?.expires_at) {
    return false;
  }

  const expiresAt = new Date(`${client.contract.expires_at}T00:00:00`);
  const diffMs = expiresAt.getTime() - now.getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

export function customerDisplayName(name: string, client: CustomerMetadata) {
  return client.trade_name || client.legal_name || name;
}
