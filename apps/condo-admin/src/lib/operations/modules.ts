import { redirect } from "next/navigation";
import type { ActiveCondominium, CondoAdminContext } from "../condominiums/context";

export type CondoOperationalModule = {
  description: string;
  href: string;
  key: string;
  phase: "available" | "foundation";
  scope: string[];
  title: string;
};

export type AuthorizedCondoOperationalContext = CondoAdminContext & {
  condominium: ActiveCondominium;
};

export const operationalModules = [
  {
    description: "Cadastro operacional de apartamentos, casas, blocos e andares.",
    href: "/dashboard/units",
    key: "units",
    phase: "available",
    scope: ["Criar e manter unidades", "Organizar blocos, numeros e andares"],
    title: "Unidades"
  },
  {
    description: "Moradores, vinculos com unidades e status operacional.",
    href: "/dashboard/residents",
    key: "residents",
    phase: "available",
    scope: ["Consultar moradores", "Manter vinculos com unidades", "Acompanhar bloqueios"],
    title: "Moradores"
  },
  {
    description: "Veiculos de moradores e visitantes autorizados.",
    href: "/dashboard/vehicles",
    key: "vehicles",
    phase: "available",
    scope: ["Centralizar placas", "Preparar regras de autorizacao", "Apoiar leitura por placa"],
    title: "Veiculos"
  },
  {
    description: "Pontos de acesso, portoes, cancelas e comandos recentes.",
    href: "/dashboard/gates",
    key: "gates",
    phase: "available",
    scope: ["Configurar pontos de acesso", "Acompanhar comandos", "Preparar integracoes"],
    title: "Portoes e cancelas"
  },
  {
    description: "Funcionarios autorizados pelo condominio.",
    href: "/dashboard/employees",
    key: "employees",
    phase: "foundation",
    scope: ["Cadastrar funcionarios", "Controlar status", "Preparar vinculo com acessos"],
    title: "Funcionarios"
  },
  {
    description: "Prestadores e fornecedores recorrentes.",
    href: "/dashboard/suppliers",
    key: "suppliers",
    phase: "foundation",
    scope: ["Organizar prestadores", "Controlar recorrencia", "Preparar regras de entrada"],
    title: "Prestadores"
  },
  {
    description: "Cadastro de visitantes, placas e historico por unidade.",
    href: "/dashboard/visitors",
    key: "visitors",
    phase: "available",
    scope: ["Consultar visitantes", "Gerenciar placas", "Acompanhar historico"],
    title: "Visitantes"
  },
  {
    description: "Convites recentes, validacoes, vagas e blacklist de placas.",
    href: "/dashboard/invites",
    key: "invites",
    phase: "available",
    scope: ["Acompanhar convites", "Validar QR/placa", "Controlar vagas visitantes"],
    title: "Convites"
  },
  {
    description: "Visao operacional da portaria para supervisao do condominio.",
    href: "/dashboard/doorman",
    key: "doorman",
    phase: "foundation",
    scope: ["Preparar fila operacional", "Acompanhar eventos pendentes", "Apoiar portaria"],
    title: "Portaria"
  },
  {
    description: "Registro administrativo de eventos operacionais.",
    href: "/dashboard/occurrences",
    key: "occurrences",
    phase: "available",
    scope: ["Registrar ocorrencias", "Classificar eventos", "Acompanhar historico"],
    title: "Ocorrencias"
  },
  {
    description: "Dados basicos, timezone e capacidade de vagas visitantes.",
    href: "/dashboard/settings",
    key: "settings",
    phase: "available",
    scope: ["Ajustar dados basicos", "Configurar vagas", "Evitar JSON exposto"],
    title: "Configuracoes do Condominio"
  }
] satisfies CondoOperationalModule[];

const allowedModulesByRole: Record<string, string[]> = {
  condominium_admin: operationalModules.map((module) => module.key),
  doorman_supervisor: ["visitors", "invites", "gates", "doorman", "occurrences"],
  manager: operationalModules.map((module) => module.key),
  resident_manager: ["units", "residents", "vehicles", "visitors", "invites"],
  syndic: operationalModules.map((module) => module.key)
};

export function getAllowedOperationalModules(role: string) {
  const allowedKeys = new Set(allowedModulesByRole[role] ?? []);
  return operationalModules.filter((module) => allowedKeys.has(module.key));
}

export function canAccessOperationalModule(role: string, moduleKey: string) {
  return allowedModulesByRole[role]?.includes(moduleKey) ?? false;
}

export function requireOperationalModuleAccess(
  context: CondoAdminContext | null,
  moduleKey: string
): AuthorizedCondoOperationalContext {
  if (!context?.condominium) {
    redirect("/dashboard?error=missing_condominium_context");
  }

  if (!canAccessOperationalModule(context.profile.role, moduleKey)) {
    redirect("/access-denied?app=condo-admin");
  }

  return { ...context, condominium: context.condominium };
}
