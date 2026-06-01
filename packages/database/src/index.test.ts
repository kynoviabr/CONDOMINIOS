import { describe, expect, it } from "vitest";
import {
  buildAuditExportFilename,
  buildAuditLogAction,
  buildInviteQrPayload,
  calculateRetentionUntil,
  createBrowserSupabaseClient,
  hasPlateAuthorization,
  isAccessDecision,
  isAccessDirection,
  isAuditEventType,
  isAuditExportFormat,
  isAuditExportStatus,
  isAuditRedactionStatus,
  isAuditRetentionPolicy,
  isAuditSeverity,
  isAuditSource,
  isAccessPointKind,
  isGateCommand,
  isInviteStatus,
  isInviteType,
  isInviteValidationResult,
  isLikelyBrazilianPlate,
  isOccurrenceSeverity,
  isOccurrenceStatus,
  isDoormanAssistantRole,
  isDoormanAssistantSessionStatus,
  isOperationalAiAlertStatus,
  isOperationalAiAlertType,
  isOperationalAiCategory,
  isOperationalAiEventSource,
  isOperationalAiProvider,
  isOperationalAiRiskLevel,
  isResidentApprovalStatus,
  isResidentFavoriteStatus,
  isResidentStatus,
  isResidentUnitRelationship,
  normalizeBrazilianPlate,
  normalizeAuditDateRange,
  normalizeInviteUsageLimit,
  normalizeNullableText,
  normalizeRiskScore,
  normalizePhone,
  normalizeSlug,
  parseJsonObject,
  parseInviteQrPayload,
  parseNonNegativeInteger,
  riskLevelFromScore
} from "./index";
import type { Database } from "./index";

describe("@kynovia/database", () => {
  it("exports a Supabase browser client factory", () => {
    expect(createBrowserSupabaseClient).toBeTypeOf("function");
  });

  it("exposes the generated database type contract", () => {
    const publicSchema = {
      Tables: {
        tenants: {
          Row: {
            id: "tenant_123",
            name: "Kynovia Demo",
            slug: "kynovia-demo",
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            name: "Kynovia Demo",
            slug: "kynovia-demo"
          },
          Update: {
            name: "Kynovia Atualizado"
          },
          Relationships: []
        },
        condominiums: {
          Row: {
            id: "condominium_123",
            tenant_id: "tenant_123",
            name: "Residencial Aurora",
            slug: "residencial-aurora",
            timezone: "America/Sao_Paulo",
            settings: {},
            operational_rules: {},
            unit_registration_mode: "vertical",
            visitor_parking_capacity: 12,
            metadata: {},
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            name: "Residencial Aurora",
            slug: "residencial-aurora"
          },
          Update: {
            unit_registration_mode: "horizontal",
            visitor_parking_capacity: 10
          },
          Relationships: []
        },
        profiles: {
          Row: {
            id: "profile_123",
            tenant_id: "tenant_123",
            full_name: "Operador Demo",
            role: "gatehouse_operator",
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            id: "profile_123",
            tenant_id: "tenant_123",
            full_name: "Operador Demo",
            role: "gatehouse_operator"
          },
          Update: {
            full_name: "Operador Atualizado"
          },
          Relationships: []
        },
        condominium_memberships: {
          Row: {
            id: "membership_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            profile_id: "profile_123",
            role: "gatehouse_operator",
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            profile_id: "profile_123",
            role: "gatehouse_operator"
          },
          Update: {
            role: "condominium_admin"
          },
          Relationships: []
        },
        units: {
          Row: {
            id: "unit_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            block: "A",
            number: "101",
            floor: "1",
            metadata: {},
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            number: "101"
          },
          Update: {
            floor: "2"
          },
          Relationships: []
        },
        access_points: {
          Row: {
            id: "access_point_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            name: "Cancela social",
            kind: "vehicle_gate",
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            name: "Cancela social",
            kind: "vehicle_gate"
          },
          Update: {
            name: "Portao social"
          },
          Relationships: []
        },
        residents: {
          Row: {
            id: "resident_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            full_name: "Maria Silva",
            document: "123",
            phone: "11999999999",
            email: "maria@example.com",
            profile_id: "profile_123",
            status: "active",
            block_reason: null,
            blocked_at: null,
            metadata: {},
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            full_name: "Maria Silva"
          },
          Update: {
            status: "blocked",
            block_reason: "Pendencia cadastral"
          },
          Relationships: []
        },
        resident_units: {
          Row: {
            id: "resident_unit_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            resident_id: "resident_123",
            unit_id: "unit_123",
            relationship: "owner",
            is_primary: true,
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            resident_id: "resident_123",
            unit_id: "unit_123"
          },
          Update: {
            relationship: "tenant"
          },
          Relationships: []
        },
        resident_vehicles: {
          Row: {
            id: "vehicle_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            resident_id: "resident_123",
            plate: "ABC1D23",
            label: "Carro principal",
            status: "active",
            block_reason: null,
            blocked_at: null,
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            resident_id: "resident_123",
            plate: "ABC1D23"
          },
          Update: {
            status: "blocked"
          },
          Relationships: []
        },
        visitors: {
          Row: {
            id: "visitor_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            full_name: "Joao Visitante",
            document: null,
            phone: null,
            notes: null,
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            full_name: "Joao Visitante"
          },
          Update: {
            notes: "Fornecedor"
          },
          Relationships: []
        },
        visitor_vehicles: {
          Row: {
            id: "visitor_vehicle_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            visitor_id: "visitor_123",
            plate: "XYZ9A87",
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            visitor_id: "visitor_123",
            plate: "XYZ9A87"
          },
          Update: {
            plate: "XYZ9A88"
          },
          Relationships: []
        },
        visitor_unit_visits: {
          Row: {
            id: "visit_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            visitor_id: "visitor_123",
            unit_id: "unit_123",
            occurred_at: "2026-05-18T00:00:00Z",
            notes: "Visita registrada",
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            visitor_id: "visitor_123",
            unit_id: "unit_123"
          },
          Update: {
            notes: "Atualizado"
          },
          Relationships: []
        },
        access_invites: {
          Row: {
            id: "invite_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            unit_id: "unit_123",
            resident_id: "resident_123",
            visitor_id: "visitor_123",
            visitor_name: "Joao Visitante",
            visitor_phone: "11999999999",
            plate: null,
            starts_at: "2026-05-18T00:00:00Z",
            expires_at: "2026-05-18T23:59:59Z",
            max_uses: 1,
            use_count: 0,
            status: "active",
            invite_type: "single",
            recurrence_rule: null,
            qr_token_hash: "hash",
            qr_token_expires_at: "2026-05-18T23:59:59Z",
            cancelled_by: null,
            cancelled_at: null,
            metadata: {},
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            visitor_name: "Joao Visitante",
            expires_at: "2026-05-18T23:59:59Z"
          },
          Update: {
            status: "cancelled"
          },
          Relationships: []
        },
        access_invite_validations: {
          Row: {
            id: "validation_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            invite_id: "invite_123",
            validated_by: "profile_123",
            result: "allowed",
            reason: null,
            created_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            result: "allowed"
          },
          Update: {
            reason: "Validacao manual"
          },
          Relationships: []
        },
        access_events: {
          Row: {
            id: "access_event_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            access_point_id: "access_point_123",
            invite_id: "invite_123",
            resident_id: null,
            visitor_id: "visitor_123",
            plate: "ABC1D23",
            direction: "entry",
            decision: "manual_review",
            reason: "Revisao da portaria",
            decided_by: "profile_123",
            decided_at: "2026-05-18T00:00:00Z",
            metadata: {},
            created_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            direction: "entry",
            decision: "allow"
          },
          Update: {
            decision: "deny"
          },
          Relationships: []
        },
        gate_commands: {
          Row: {
            id: "gate_command_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            access_point_id: "access_point_123",
            access_event_id: "access_event_123",
            command: "open",
            provider: "mock",
            status: "pending",
            requested_by: "profile_123",
            requested_at: "2026-05-18T00:00:00Z",
            executed_at: null,
            metadata: {},
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            access_point_id: "access_point_123",
            command: "open"
          },
          Update: {
            status: "confirmed"
          },
          Relationships: []
        },
        gatehouse_occurrences: {
          Row: {
            id: "occurrence_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            title: "Entrega sem autorizacao",
            description: "Visitante aguardando confirmacao.",
            severity: "medium",
            status: "open",
            created_by: "profile_123",
            resolved_by: null,
            resolved_at: null,
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            title: "Entrega sem autorizacao"
          },
          Update: {
            status: "resolved"
          },
          Relationships: []
        },
        audit_logs: {
          Row: {
            id: "audit_log_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            actor_profile_id: "profile_123",
            actor_user_id: "profile_123",
            action: "gate_command.insert",
            entity_table: "gate_commands",
            entity_id: "gate_command_123",
            event_type: "physical_command",
            source: "database_trigger",
            severity: "info",
            occurred_at: "2026-05-18T00:00:00Z",
            correlation_id: "access_event_123",
            retention_policy: "operational",
            retention_until: "2027-05-18",
            redaction_status: "none",
            before_state: null,
            after_state: {},
            metadata: {},
            created_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            action: "access_event.insert",
            entity_table: "access_events"
          },
          Update: undefined as never,
          Relationships: []
        },
        audit_retention_policies: {
          Row: {
            id: "audit_policy_123",
            tenant_id: "tenant_123",
            condominium_id: null,
            event_type: "operational_event",
            retention_days: 365,
            legal_basis: "legitimate_interest",
            status: "active",
            notes: null,
            created_by: "profile_123",
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            event_type: "operational_event",
            retention_days: 365
          },
          Update: {
            retention_days: 730
          },
          Relationships: []
        },
        audit_log_export_requests: {
          Row: {
            id: "audit_export_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            requested_by: "profile_123",
            status: "pending",
            format: "csv",
            filters: {},
            file_path: null,
            exported_at: null,
            expires_at: null,
            failure_reason: null,
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            requested_by: "profile_123"
          },
          Update: {
            status: "completed",
            file_path: "private://audit/export.csv"
          },
          Relationships: []
        },
        vehicle_plate_blacklist: {
          Row: {
            id: "blacklist_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            plate: "ABC1D23",
            reason: "Bloqueio operacional",
            status: "active",
            created_by: "profile_123",
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            plate: "ABC1D23"
          },
          Update: {
            status: "inactive"
          },
          Relationships: []
        },
        visitor_vehicle_accesses: {
          Row: {
            id: "vehicle_access_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            invite_id: "invite_123",
            unit_id: "unit_123",
            plate: "ABC1D23",
            visitor_name: "Joao Visitante",
            status: "active",
            entered_at: "2026-05-18T00:00:00Z",
            exited_at: null,
            entry_validated_by: "profile_123",
            exit_validated_by: null,
            notes: null,
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            plate: "ABC1D23",
            visitor_name: "Joao Visitante"
          },
          Update: {
            status: "exited"
          },
          Relationships: []
        },
        resident_favorite_visitors: {
          Row: {
            id: "favorite_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            resident_id: "resident_123",
            unit_id: "unit_123",
            visitor_name: "Joao Visitante",
            visitor_phone: "11999999999",
            plate: "ABC1D23",
            notes: "Familiar",
            status: "active",
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            resident_id: "resident_123",
            visitor_name: "Joao Visitante"
          },
          Update: {
            status: "archived"
          },
          Relationships: []
        },
        resident_access_approvals: {
          Row: {
            id: "approval_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            resident_id: "resident_123",
            unit_id: "unit_123",
            visitor_name: "Joao Visitante",
            visitor_phone: "11999999999",
            plate: "ABC1D23",
            status: "pending",
            requested_by: "profile_123",
            decided_by: null,
            decided_at: null,
            expires_at: "2026-05-18T01:00:00Z",
            notes: "Aguardando morador",
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            resident_id: "resident_123",
            visitor_name: "Joao Visitante"
          },
          Update: {
            status: "approved"
          },
          Relationships: []
        },
        operational_ai_analyses: {
          Row: {
            id: "analysis_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            provider: "mock_ai",
            model: null,
            event_source: "access_event",
            event_id: "access_event_123",
            category: "possible_fraud",
            risk_level: "high",
            risk_score: 78,
            confidence: 0.91,
            summary: "Tentativas negadas recorrentes.",
            recommendations: [],
            signals: [],
            status: "completed",
            reviewed_by: null,
            reviewed_at: null,
            metadata: {},
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            event_source: "access_event",
            category: "possible_fraud",
            risk_level: "high",
            risk_score: 78,
            confidence: 0.91,
            summary: "Tentativas negadas recorrentes."
          },
          Update: {
            status: "dismissed"
          },
          Relationships: []
        },
        operational_ai_alerts: {
          Row: {
            id: "alert_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            analysis_id: "analysis_123",
            alert_type: "possible_fraud",
            severity: "high",
            title: "Possivel fraude",
            description: null,
            status: "open",
            assigned_to: null,
            acknowledged_by: null,
            acknowledged_at: null,
            resolved_by: null,
            resolved_at: null,
            metadata: {},
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            alert_type: "possible_fraud",
            title: "Possivel fraude"
          },
          Update: {
            status: "acknowledged"
          },
          Relationships: []
        },
        doorman_assistant_sessions: {
          Row: {
            id: "assistant_session_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            operator_profile_id: "profile_123",
            status: "open",
            title: "Apoio portaria",
            last_message_at: "2026-05-18T00:00:00Z",
            metadata: {},
            created_at: "2026-05-18T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123"
          },
          Update: {
            status: "closed"
          },
          Relationships: []
        },
        doorman_assistant_messages: {
          Row: {
            id: "assistant_message_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            session_id: "assistant_session_123",
            role: "assistant",
            content: "Revise o cadastro antes da liberacao.",
            model: "mock",
            safety_flags: [],
            metadata: {},
            created_at: "2026-05-18T00:00:00Z"
          },
          Insert: {
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            session_id: "assistant_session_123",
            role: "operator",
            content: "O que devo revisar?"
          },
          Update: undefined as never,
          Relationships: []
        }
      },
      Views: {
        audit_log_export_view: {
          Row: {
            id: "audit_log_123",
            tenant_id: "tenant_123",
            condominium_id: "condominium_123",
            actor_profile_id: "profile_123",
            actor_user_id: "profile_123",
            event_type: "physical_command",
            action: "gate_command.insert",
            entity_table: "gate_commands",
            entity_id: "gate_command_123",
            source: "database_trigger",
            severity: "info",
            occurred_at: "2026-05-18T00:00:00Z",
            correlation_id: "access_event_123",
            retention_policy: "operational",
            retention_until: "2027-05-18",
            redaction_status: "none",
            metadata: {},
            created_at: "2026-05-18T00:00:00Z"
          },
          Relationships: []
        }
      },
      Functions: {},
      Enums: {},
      CompositeTypes: {}
    } satisfies Database["public"];

    expect(publicSchema.Tables.profiles.Row.role).toBe("gatehouse_operator");
  });

  it("normalizes condominium management inputs", () => {
    expect(normalizeSlug("Residencial Águas Claras")).toBe("residencial-aguas-claras");
    expect(normalizeNullableText("  ")).toBeNull();
    expect(parseNonNegativeInteger("-1", 5)).toBe(5);
    expect(parseJsonObject('{ "quietHours": true }')).toEqual({ quietHours: true });
    expect(isAccessPointKind("vehicle_gate")).toBe(true);
    expect(isAccessPointKind("unknown")).toBe(false);
  });

  it("normalizes resident, vehicle, and visitor inputs", () => {
    expect(normalizeBrazilianPlate("abc-1d23")).toBe("ABC1D23");
    expect(isLikelyBrazilianPlate("ABC-1234")).toBe(true);
    expect(isLikelyBrazilianPlate("ABC1D23")).toBe(true);
    expect(isLikelyBrazilianPlate("A1")).toBe(false);
    expect(normalizePhone("(11) 99999-0000")).toBe("11999990000");
    expect(isResidentStatus("blocked")).toBe(true);
    expect(isResidentStatus("pending")).toBe(false);
    expect(isResidentUnitRelationship("owner")).toBe(true);
    expect(isResidentFavoriteStatus("active")).toBe(true);
    expect(isResidentFavoriteStatus("deleted")).toBe(false);
    expect(isResidentApprovalStatus("approved")).toBe(true);
    expect(isResidentApprovalStatus("waiting")).toBe(false);
  });

  it("normalizes invite and QR inputs", () => {
    const payload = buildInviteQrPayload("invite_123", "token_456");

    expect(payload).toBe("invite_123.token_456");
    expect(parseInviteQrPayload(payload)).toEqual({ inviteId: "invite_123", token: "token_456" });
    expect(parseInviteQrPayload("broken")).toBeNull();
    expect(normalizeInviteUsageLimit("3")).toBe(3);
    expect(normalizeInviteUsageLimit("0", 2)).toBe(2);
    expect(isInviteStatus("active")).toBe(true);
    expect(isInviteStatus("pending")).toBe(false);
    expect(isInviteType("recurring")).toBe(true);
    expect(isInviteValidationResult("usage_limit_reached")).toBe(true);
    expect(isInviteValidationResult("blacklisted")).toBe(true);
    expect(hasPlateAuthorization("ABC1D23")).toBe(true);
    expect(hasPlateAuthorization("")).toBe(false);
  });

  it("normalizes gatehouse operation contracts", () => {
    expect(isAccessDirection("entry")).toBe(true);
    expect(isAccessDirection("transfer")).toBe(false);
    expect(isAccessDecision("manual_review")).toBe(true);
    expect(isAccessDecision("pending")).toBe(false);
    expect(isGateCommand("open")).toBe(true);
    expect(isGateCommand("unlock")).toBe(false);
    expect(isOccurrenceSeverity("critical")).toBe(true);
    expect(isOccurrenceSeverity("urgent")).toBe(false);
    expect(isOccurrenceStatus("open")).toBe(true);
    expect(isOccurrenceStatus("archived")).toBe(false);
  });

  it("normalizes audit and compliance contracts", () => {
    expect(isAuditEventType("permission_change")).toBe(true);
    expect(isAuditEventType("feature_flag")).toBe(false);
    expect(isAuditSource("database_trigger")).toBe(true);
    expect(isAuditSeverity("critical")).toBe(true);
    expect(isAuditRetentionPolicy("lgpd_request")).toBe(true);
    expect(isAuditRedactionStatus("redacted")).toBe(true);
    expect(isAuditExportStatus("completed")).toBe(true);
    expect(isAuditExportFormat("csv")).toBe(true);
    expect(buildAuditLogAction("Gate Command", "Manual Open")).toBe("gate_command.manual_open");
    expect(normalizeAuditDateRange("2026-05-18", "2026-05-19")).toEqual({
      from: "2026-05-18T00:00:00.000Z",
      to: "2026-05-19T00:00:00.000Z"
    });
    expect(normalizeAuditDateRange("2026-05-20", "2026-05-19")).toBeNull();
    expect(calculateRetentionUntil("2026-05-18T00:00:00.000Z", 365)).toBe("2027-05-18");
    expect(
      buildAuditExportFilename({
        tenantId: "Tenant Demo",
        condominiumId: "Condomínio A",
        from: "2026-05-18",
        to: "2026-05-19",
        format: "csv"
      })
    ).toBe("audit_tenant_demo_condominio_a_2026-05-18_2026-05-19.csv");
  });

  it("normalizes operational AI contracts", () => {
    expect(isOperationalAiProvider("mock_ai")).toBe(true);
    expect(isOperationalAiEventSource("access_event")).toBe(true);
    expect(isOperationalAiCategory("possible_fraud")).toBe(true);
    expect(isOperationalAiRiskLevel("critical")).toBe(true);
    expect(isOperationalAiAlertType("hardware_attention")).toBe(true);
    expect(isOperationalAiAlertStatus("acknowledged")).toBe(true);
    expect(isDoormanAssistantRole("assistant")).toBe(true);
    expect(isDoormanAssistantSessionStatus("closed")).toBe(true);
    expect(normalizeRiskScore(120.2)).toBe(100);
    expect(riskLevelFromScore(71)).toBe("high");
  });
});
