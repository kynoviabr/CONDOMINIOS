import { describe, expect, it } from "vitest";
import {
  buildInviteQrPayload,
  canResidentCreateInviteForUnit,
  hasPlateAuthorization,
  hashInviteToken,
  isInviteStatus,
  isInviteType,
  isInviteValidationResult,
  normalizeInviteUsageLimit,
  parseInviteQrPayload
} from "./invites";

describe("Digital Invites and QR Code domain helpers", () => {
  const profileId = "11111111-1111-1111-1111-111111111111";
  const condominiumId = "22222222-2222-2222-2222-222222222222";
  const otherCondominiumId = "33333333-3333-3333-3333-333333333333";
  const ownUnitId = "44444444-4444-4444-4444-444444444444";
  const otherUnitId = "55555555-5555-5555-5555-555555555555";

  it("permite que morador ativo crie convite para sua própria unidade vinculada", () => {
    const allowed = canResidentCreateInviteForUnit({
      authUserId: profileId,
      condominiumId,
      residentCondominiumId: condominiumId,
      residentProfileId: profileId,
      residentStatus: "active",
      residentUnitIds: [ownUnitId],
      targetUnitId: ownUnitId
    });

    expect(allowed).toBe(true);
  });

  it("impede que morador crie convite para unidade que não pertence ao seu cadastro", () => {
    const allowed = canResidentCreateInviteForUnit({
      authUserId: profileId,
      condominiumId,
      residentCondominiumId: condominiumId,
      residentProfileId: profileId,
      residentStatus: "active",
      residentUnitIds: [ownUnitId],
      targetUnitId: otherUnitId
    });

    expect(allowed).toBe(false);
  });

  it("impede que usuário anônimo (sem auth.uid) crie convite", () => {
    const allowed = canResidentCreateInviteForUnit({
      authUserId: null,
      condominiumId,
      residentCondominiumId: condominiumId,
      residentProfileId: profileId,
      residentStatus: "active",
      residentUnitIds: [ownUnitId],
      targetUnitId: ownUnitId
    });

    expect(allowed).toBe(false);
  });

  it("impede que morador inativo ou bloqueado crie convite", () => {
    const allowed = canResidentCreateInviteForUnit({
      authUserId: profileId,
      condominiumId,
      residentCondominiumId: condominiumId,
      residentProfileId: profileId,
      residentStatus: "inactive",
      residentUnitIds: [ownUnitId],
      targetUnitId: ownUnitId
    });

    expect(allowed).toBe(false);
  });

  it("impede que morador de outro condomínio crie convite", () => {
    const allowed = canResidentCreateInviteForUnit({
      authUserId: profileId,
      condominiumId: otherCondominiumId,
      residentCondominiumId: condominiumId,
      residentProfileId: profileId,
      residentStatus: "active",
      residentUnitIds: [ownUnitId],
      targetUnitId: ownUnitId
    });

    expect(allowed).toBe(false);
  });

  it("gera hash SHA-256 do token do convite sem expor o token puro", () => {
    const rawToken = "my_secret_token_12345";
    const hash = hashInviteToken(rawToken);

    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(rawToken);
    expect(hash).toBe(hashInviteToken(rawToken));
  });

  it("constrói e faz parse de payload de QR Code no padrão inviteId.token", () => {
    const inviteId = "abc-123";
    const token = "tok-789";
    const payload = buildInviteQrPayload(inviteId, token);

    expect(payload).toBe("abc-123.tok-789");

    const parsed = parseInviteQrPayload(payload);
    expect(parsed).toEqual({ inviteId: "abc-123", token: "tok-789" });
  });

  it("retorna null ao fazer parse de payload de QR Code inválido", () => {
    expect(parseInviteQrPayload("")).toBeNull();
    expect(parseInviteQrPayload("invalid_payload_without_dot")).toBeNull();
  });

  it("normaliza limites de uso de convite", () => {
    expect(normalizeInviteUsageLimit("5")).toBe(5);
    expect(normalizeInviteUsageLimit("0")).toBe(1);
    expect(normalizeInviteUsageLimit("-3")).toBe(1);
    expect(normalizeInviteUsageLimit("invalid", 3)).toBe(3);
  });

  it("valida status, tipos e resultados de convite", () => {
    expect(isInviteStatus("active")).toBe(true);
    expect(isInviteStatus("cancelled")).toBe(true);
    expect(isInviteStatus("unknown")).toBe(false);

    expect(isInviteType("single")).toBe(true);
    expect(isInviteType("recurring")).toBe(true);
    expect(isInviteType("permanent")).toBe(false);

    expect(isInviteValidationResult("allowed")).toBe(true);
    expect(isInviteValidationResult("expired")).toBe(true);
    expect(isInviteValidationResult("invalid")).toBe(true);
  });

  it("verifica autorização de placa", () => {
    expect(hasPlateAuthorization("ABC1D23")).toBe(true);
    expect(hasPlateAuthorization("   ")).toBe(false);
    expect(hasPlateAuthorization(null)).toBe(false);
    expect(hasPlateAuthorization(undefined)).toBe(false);
  });
});
