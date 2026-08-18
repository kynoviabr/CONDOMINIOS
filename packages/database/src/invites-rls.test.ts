import { describe, expect, it } from "vitest";

/**
 * Testes Unitários de Referência Conceitual em TypeScript para Regras de Domínio de Convites
 *
 * ATENÇÃO: Esta suíte contém testes unitários conceituais em TypeScript para verificação
 * rápida da lógica de domínio em memória.
 *
 * Os testes reais de banco de dados, execução das migrations, verificação de grants
 * e aplicação efetiva de Row Level Security (RLS) no PostgreSQL são executados via pgTAP em:
 * `supabase/tests/database/access_invites_rls.test.sql`
 * Comando: `pnpm test:rls` (ou `supabase test db`)
 */

type ReferenceContext = {
  authUid: string | null;
  currentTenantId: string | null;
  isOperator: boolean;
  residents: Array<{
    condominiumId: string;
    id: string;
    profileId: string;
    status: "active" | "inactive" | "blocked";
    tenantId: string;
  }>;
  residentUnits: Array<{
    condominiumId: string;
    residentId: string;
    tenantId: string;
    unitId: string;
  }>;
};

type AccessInviteRecord = {
  condominium_id: string;
  id: string;
  invite_type: string;
  plate: string | null;
  resident_id: string;
  status: string;
  tenant_id: string;
  unit_id: string;
  visitor_name: string;
};

function evaluateAccessInvitesSelectRule(
  row: AccessInviteRecord,
  ctx: ReferenceContext
): boolean {
  if (ctx.isOperator) {
    return true;
  }
  if (!ctx.authUid || !ctx.currentTenantId) {
    return false;
  }
  if (row.tenant_id !== ctx.currentTenantId) {
    return false;
  }

  return ctx.residents.some((r) => {
    if (
      r.id === row.resident_id &&
      r.profileId === ctx.authUid &&
      r.status === "active" &&
      r.tenantId === row.tenant_id &&
      r.condominiumId === row.condominium_id
    ) {
      return ctx.residentUnits.some(
        (ru) =>
          ru.residentId === r.id &&
          ru.unitId === row.unit_id &&
          ru.condominiumId === row.condominium_id &&
          ru.tenantId === row.tenant_id
      );
    }
    return false;
  });
}

function evaluateAccessInvitesInsertRule(
  row: AccessInviteRecord,
  ctx: ReferenceContext
): boolean {
  return evaluateAccessInvitesSelectRule(row, ctx);
}

function evaluateAccessInvitesUpdateRule(
  row: AccessInviteRecord,
  ctx: ReferenceContext
): boolean {
  return evaluateAccessInvitesSelectRule(row, ctx);
}

function evaluateAccessInvitesDeleteRule(
  _row: AccessInviteRecord,
  ctx: ReferenceContext
): boolean {
  return ctx.isOperator;
}

describe("Modelos Conceituais de Referência (Unitários TypeScript) para Convites", () => {
  const tenantA = "tenant-a-uuid";
  const tenantB = "tenant-b-uuid";
  const condoA = "condo-a-uuid";
  const condoB = "condo-b-uuid";
  const unitA1 = "unit-a1-uuid";
  const unitA2 = "unit-a2-uuid";
  const userProfileId = "user-profile-001";
  const residentActiveId = "res-active-001";
  const residentInactiveId = "res-inactive-002";

  const mockDbState: ReferenceContext = {
    authUid: userProfileId,
    currentTenantId: tenantA,
    isOperator: false,
    residents: [
      {
        id: residentActiveId,
        profileId: userProfileId,
        tenantId: tenantA,
        condominiumId: condoA,
        status: "active"
      },
      {
        id: residentInactiveId,
        profileId: userProfileId,
        tenantId: tenantA,
        condominiumId: condoA,
        status: "inactive"
      }
    ],
    residentUnits: [
      {
        residentId: residentActiveId,
        unitId: unitA1,
        condominiumId: condoA,
        tenantId: tenantA
      },
      {
        residentId: residentInactiveId,
        unitId: unitA1,
        condominiumId: condoA,
        tenantId: tenantA
      }
    ]
  };

  it("permite criacao de convite por morador ativo para sua unidade vinculada", () => {
    const invite: AccessInviteRecord = {
      id: "inv-001",
      tenant_id: tenantA,
      condominium_id: condoA,
      unit_id: unitA1,
      resident_id: residentActiveId,
      visitor_name: "Visitante Valido",
      plate: null,
      invite_type: "single",
      status: "active"
    };

    const allowed = evaluateAccessInvitesInsertRule(invite, mockDbState);
    expect(allowed).toBe(true);
  });

  it("nega criacao de convite para unidade de outro morador", () => {
    const inviteOtherUnit: AccessInviteRecord = {
      id: "inv-002",
      tenant_id: tenantA,
      condominium_id: condoA,
      unit_id: unitA2,
      resident_id: residentActiveId,
      visitor_name: "Visitante",
      plate: null,
      invite_type: "single",
      status: "active"
    };

    const allowed = evaluateAccessInvitesInsertRule(inviteOtherUnit, mockDbState);
    expect(allowed).toBe(false);
  });

  it("nega criacao de convite para outro condominio", () => {
    const inviteOtherCondo: AccessInviteRecord = {
      id: "inv-003",
      tenant_id: tenantA,
      condominium_id: condoB,
      unit_id: unitA1,
      resident_id: residentActiveId,
      visitor_name: "Visitante",
      plate: null,
      invite_type: "single",
      status: "active"
    };

    const allowed = evaluateAccessInvitesInsertRule(inviteOtherCondo, mockDbState);
    expect(allowed).toBe(false);
  });

  it("nega criacao de convite com tenant_id de outro cliente", () => {
    const inviteOtherTenant: AccessInviteRecord = {
      id: "inv-004",
      tenant_id: tenantB,
      condominium_id: condoA,
      unit_id: unitA1,
      resident_id: residentActiveId,
      visitor_name: "Visitante",
      plate: null,
      invite_type: "single",
      status: "active"
    };

    const allowed = evaluateAccessInvitesInsertRule(inviteOtherTenant, mockDbState);
    expect(allowed).toBe(false);
  });

  it("nega criacao de convite por morador inativo", () => {
    const inviteInactive: AccessInviteRecord = {
      id: "inv-005",
      tenant_id: tenantA,
      condominium_id: condoA,
      unit_id: unitA1,
      resident_id: residentInactiveId,
      visitor_name: "Visitante",
      plate: null,
      invite_type: "single",
      status: "active"
    };

    const allowed = evaluateAccessInvitesInsertRule(inviteInactive, mockDbState);
    expect(allowed).toBe(false);
  });

  it("nega criacao de convite por usuario autenticado sem vinculo residencial", () => {
    const unlinkedCtx: ReferenceContext = {
      authUid: "user-sem-morador",
      currentTenantId: tenantA,
      isOperator: false,
      residents: [],
      residentUnits: []
    };

    const invite: AccessInviteRecord = {
      id: "inv-006",
      tenant_id: tenantA,
      condominium_id: condoA,
      unit_id: unitA1,
      resident_id: residentActiveId,
      visitor_name: "Visitante",
      plate: null,
      invite_type: "single",
      status: "active"
    };

    const allowed = evaluateAccessInvitesInsertRule(invite, unlinkedCtx);
    expect(allowed).toBe(false);
  });

  it("nega criacao de convite por usuario anonimo (sem auth)", () => {
    const anonCtx: ReferenceContext = {
      authUid: null,
      currentTenantId: null,
      isOperator: false,
      residents: mockDbState.residents,
      residentUnits: mockDbState.residentUnits
    };

    const invite: AccessInviteRecord = {
      id: "inv-007",
      tenant_id: tenantA,
      condominium_id: condoA,
      unit_id: unitA1,
      resident_id: residentActiveId,
      visitor_name: "Visitante Anon",
      plate: null,
      invite_type: "single",
      status: "active"
    };

    const allowed = evaluateAccessInvitesInsertRule(invite, anonCtx);
    expect(allowed).toBe(false);
  });

  it("permite atualizacao (cancelamento) do proprio convite pelo morador", () => {
    const invite: AccessInviteRecord = {
      id: "inv-001",
      tenant_id: tenantA,
      condominium_id: condoA,
      unit_id: unitA1,
      resident_id: residentActiveId,
      visitor_name: "Visitante",
      plate: null,
      invite_type: "single",
      status: "cancelled"
    };

    const allowed = evaluateAccessInvitesUpdateRule(invite, mockDbState);
    expect(allowed).toBe(true);
  });

  it("nega atualizacao de convite de outro morador", () => {
    const otherResidentInvite: AccessInviteRecord = {
      id: "inv-999",
      tenant_id: tenantA,
      condominium_id: condoA,
      unit_id: unitA2,
      resident_id: "res-outro-morador",
      visitor_name: "Outro",
      plate: null,
      invite_type: "single",
      status: "cancelled"
    };

    const allowed = evaluateAccessInvitesUpdateRule(otherResidentInvite, mockDbState);
    expect(allowed).toBe(false);
  });

  it("nega tentativa de DELETE por morador (restrito a operadores)", () => {
    const invite: AccessInviteRecord = {
      id: "inv-001",
      tenant_id: tenantA,
      condominium_id: condoA,
      unit_id: unitA1,
      resident_id: residentActiveId,
      visitor_name: "Visitante",
      plate: null,
      invite_type: "single",
      status: "active"
    };

    // Morador autenticado tentando DELETE
    expect(evaluateAccessInvitesDeleteRule(invite, mockDbState)).toBe(false);

    // Operador autenticado tentando DELETE
    const operatorCtx: ReferenceContext = { ...mockDbState, isOperator: true };
    expect(evaluateAccessInvitesDeleteRule(invite, operatorCtx)).toBe(true);
  });
});
