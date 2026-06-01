# Database Schema

This document summarizes the foundation schema created for Kynovia Access.

## Tenant Core

- `tenants`: top-level SaaS tenant.
- `condominiums`: condominium/property under a tenant, including timezone, JSON settings,
  JSON operational rules, visitor parking capacity, and metadata.
- `profiles`: authenticated user profile linked to a tenant.
- `condominium_memberships`: profile access to a condominium with an operational role.

## Property Operations

- `units`: condominium units.
- `residents`: residents scoped to a condominium, optionally linked to an authenticated profile for
  resident self-service.
- `resident_units`: resident-to-unit relationships.
- `resident_vehicles`: resident vehicles, unique by condominium and plate.
- `visitors`: visitor records scoped to a condominium.
- `visitor_vehicles`: visitor vehicle plates.
- `visitor_unit_visits`: visitor history linked to a condominium unit.
- `resident_favorite_visitors`: resident-managed frequent visitors for fast invite creation.
- `resident_access_approvals`: pending visitor approvals sent to residents.

## Access Control

- `access_points`: gatehouse, gate, pedestrian entry, or future physical access points.
- `access_invites`: visitor authorization window, optional plate, usage limits, QR token hash,
  recurrence metadata, cancellation metadata, and status.
- `access_invite_validations`: history of gatehouse QR validations and their outcomes.
- `vehicle_plate_blacklist`: condominium-scoped blocked visitor plates.
- `visitor_vehicle_accesses`: active and historical visitor vehicle entries/exits by plate.
- `access_events`: access decisions such as allow, deny, or manual review.
- `gate_commands`: physical command queue for gates and relays.
- `gatehouse_occurrences`: doorman operational occurrences with severity and resolution status.

## Compliance

- `audit_logs`: immutable audit records for sensitive actions, operational events, physical
  commands, permission changes, data exports, security events, and system events.
- `audit_retention_policies`: tenant-scoped retention rules by audit event type.
- `audit_log_export_requests`: export workflow requests for audit and access-report data.
- `audit_log_export_view`: export-safe audit projection that keeps RLS active through
  `security_invoker = true`.

`audit_logs` blocks update and delete operations with a database trigger.

## Operational AI

- `operational_ai_analyses`: AI-assisted event classifications, summaries, confidence, risk scores,
  recommendations, and source event references.
- `operational_ai_alerts`: open, acknowledged, resolved, or dismissed alerts generated from
  analysis results.
- `doorman_assistant_sessions`: tenant and condominium-scoped assistant conversations for portaria
  support.
- `doorman_assistant_messages`: operator, assistant, and system messages with safety flags.

## Multi-Tenant Rule

Every operational record includes:

- `tenant_id`
- `condominium_id`, when the record belongs to a condominium

This supports tenant-wide administration and condominium-level isolation.

## Phase 04 Management Rules

- Tenant admins and platform admins may create, update, and remove condominiums for their tenant.
- Condominium admins and gatehouse operators may manage operational records that already belong to
  condominiums they can operate, such as units and access points.
- Units are always linked to a condominium through `condominium_id` and remain unique by
  `condominium_id`, `block`, and `number`.
- Visitor parking capacity is stored on `condominiums.visitor_parking_capacity` and constrained to
  non-negative values.

## Phase 05 Resident And Visitor Rules

- Residents are scoped by `tenant_id` and `condominium_id`.
- Resident status must be `active`, `inactive`, or `blocked`.
- Condo Admin stores CPF in `residents.document` and uses `residents.metadata` for customer-facing
  operational details that do not yet need dedicated columns, such as birth date, WhatsApp,
  observations, and prepared photo-upload state.
- Blocked residents and resident vehicles may carry a block reason and timestamp.
- Resident vehicles are normalized by plate before write and remain unique per condominium.
- Resident-unit links are stored in `resident_units` and support primary unit markers.
- Visitors are basic contact records scoped to a condominium.
- Visitor history by unit is stored in `visitor_unit_visits`.
- Bulk resident CSV import is planned separately and documented in
  `docs/implementation/resident-csv-import.md`.

## Phase 06 Digital Invite And QR Rules

- Digital invites are stored in `access_invites` and remain tenant-aware through `tenant_id`,
  `condominium_id`, `resident_id`, and `unit_id`.
- Resident self-service requires an active `residents.profile_id` link and an existing
  `resident_units` relationship for the selected unit.
- QR codes store only `qr_token_hash` in the database. The raw token is returned to the resident once
  when the invite is created.
- Invite validity is controlled by `starts_at`, `expires_at`, `qr_token_expires_at`, `max_uses`,
  `use_count`, and `status`.
- Recurrent invites are represented by `invite_type = 'recurring'` and a descriptive
  `recurrence_rule`; scheduling automation is intentionally left for a later operational story.
- Gatehouse validations are recorded in `access_invite_validations` with a normalized result such as
  `allowed`, `expired`, `cancelled`, `not_started`, `usage_limit_reached`, or `invalid`.

## Phase 07 Vehicle Plate Invite Rules

- A digital invite may include an optional normalized Brazilian plate in `access_invites.plate`.
- Plate values must match the normalized Brazilian plate format used by the application helpers.
- Gatehouse operators can validate access by plate without scanning the QR payload.
- A successful plate entry increments `access_invites.use_count` and creates a
  `visitor_vehicle_accesses` active stay.
- A visitor vehicle can have only one active stay per condominium and plate.
- Visitor parking capacity is checked against `condominiums.visitor_parking_capacity`; a value of
  `0` means no capacity limit is enforced.
- Exits are recorded by updating the active `visitor_vehicle_accesses` row with `exited_at`,
  `exit_validated_by`, and `status = 'exited'`.
- `vehicle_plate_blacklist` blocks active plates before invite lookup and records the denied
  validation result.

## Phase 08 Doorman Panel Rules

- The doorman panel reads `access_events` as the operational access queue.
- Events with `decision = 'manual_review'` are treated as pending validation items.
- Manual releases and denials are recorded in `access_events` with `metadata.source = 'doorman_panel'`.
- A manual release can create a `gate_commands` row with provider `mock` and status `pending` when
  an access point is selected.
- Gate status is derived from the latest `gate_commands` row for each `access_point_id`.
- Open doorman incidents are stored in `gatehouse_occurrences` with severity and status fields.
- `gatehouse_occurrences` is tenant-aware through `tenant_id` and condominium-aware through
  `condominium_id`.

## Phase 09 Resident PWA Rules

- Resident favorite visitors are stored in `resident_favorite_visitors` and remain scoped to
  `tenant_id`, `condominium_id`, `resident_id`, and optionally `unit_id`.
- Favorite visitor rows are archived with `status = 'archived'` instead of being physically deleted.
- Resident approval requests are stored in `resident_access_approvals` with pending, approved,
  rejected, or expired status.
- Gatehouse operators may create approval requests; the linked active resident may approve or reject
  a pending request before `expires_at`.
- The PWA reads invite history, validation history, and visitor vehicle access history to present a
  resident-facing access timeline.

## Phase 11 Gate Integration Rules

- Gate command rows remain the database source of truth for physical command requests.
- Providers are represented by `gate_commands.provider`; initial provider contracts are `mock_gate`
  and `http_relay`.
- Provider dispatch is side-effectful and must happen outside the database through app, job, or Edge
  Function code.
- Provider results should update `gate_commands.status`, `executed_at`, and `metadata` with audit
  details returned by `@kynovia/integrations`.
- Hardware credentials and relay URLs must stay in server-side environment variables.

## Phase 12 LPR Rules

- License Plate Recognition events should be persisted as operational access events, not as direct
  access decisions.
- Store normalized plates in uppercase without separators.
- Keep the provider name, access point, confidence score, and manual review flag.
- Low-confidence readings must create an operator review path instead of a gate command.
- `@kynovia/integrations` parses webhook payloads and builds an access subject.
- `@kynovia/access-engine` remains responsible for the final allow, deny, or manual review decision.
- Plate Recognizer credentials and webhook verification secrets must live in server-side
  environment variables or Supabase Edge Function secrets.
- Raw provider payload retention must follow the audit and LGPD retention policy.

## Phase 13 Facial Biometrics Rules

- Facial biometrics require explicit consent before enrollment or validation.
- Consent records must store the accepted consent version, grant timestamp, optional expiration, and
  revocation status.
- Biometric templates and raw face images must not be exposed to frontend code or stored in public
  buckets.
- Store provider subject ids and audit metadata, not provider secrets.
- Facial validation must include confidence and liveness scores.
- Low confidence, missing consent, expired consent, or failed liveness must route to manual review
  instead of a gate command.
- Facial blacklist hits must produce a denied validation result with an auditable reason.
- `@kynovia/integrations` validates provider payloads and builds audit metadata.
- `@kynovia/access-engine` remains responsible for the final allow, deny, or manual review decision.
- Facial provider credentials, webhook secrets, and template encryption keys must live in
  server-side environment variables or Supabase Edge Function secrets.

## Phase 14 Audit, Logs, And Compliance Rules

- `audit_logs` is append-only. Updates and deletes are blocked at the database layer.
- Audit records include event type, source, severity, occurrence timestamp, actor identifiers,
  entity target, correlation id, retention policy, redaction status, metadata, and optional
  before/after snapshots.
- `gate_commands` changes are logged automatically as physical command audit records.
- `profiles` and `condominium_memberships` role or membership changes are logged automatically as
  permission-change audit records.
- Retention policies are modeled in `audit_retention_policies`; deletion automation is intentionally
  deferred until a reviewed operational job exists.
- Export requests are tracked in `audit_log_export_requests` and must write only to private storage
  when implemented.
- `audit_log_export_view` uses `security_invoker = true` so audit exports do not bypass RLS.
- Audit metadata must not store service role keys, provider secrets, raw biometric material, or
  unnecessary personal data.
- Access reports should preserve tenant, condominium, date-range, and RLS boundaries.

## Phase 15 Operational AI Rules

- Operational AI is advisory. It must not directly allow access, deny access, or dispatch physical
  gate commands.
- AI analyses are stored in `operational_ai_analyses` with event source, risk level, score,
  confidence, summary, recommendations, signals, and metadata.
- AI alerts are stored in `operational_ai_alerts` and require operator/admin acknowledgement or
  resolution.
- Doorman assistant sessions and messages are scoped by `tenant_id` and `condominium_id`.
- Provider configuration must stay server-side through `AI_PROVIDER`, `AI_MODEL`, `OPENAI_API_KEY`,
  and related environment variables.
- Prompt inputs must avoid service role keys, provider tokens, raw biometric material, and
  unnecessary personal data.
- `@kynovia/access-engine` provides deterministic risk scoring; `@kynovia/integrations` provides
  provider contracts and audit metadata for future AI calls.
