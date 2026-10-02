# Database

This section documents the Supabase/Postgres data model.

## Source Of Truth

Database structure is defined in `supabase/migrations`.

Local seed data is defined in `supabase/seed.sql`.

## Current Model

The database model is intentionally tenant-aware from the first production-facing schema.

- `tenants`
- `condominiums`
- `profiles`
- `access_points`
- `condominium_memberships`
- `units`
- `residents`
- `resident_units`
- `resident_vehicles`
- `visitors`
- `visitor_vehicles`
- `access_invites`
- `access_events`
- `gate_commands`
- `audit_logs`
- `audit_retention_policies`
- `audit_log_export_requests`
- `operational_ai_analyses`
- `operational_ai_alerts`
- `doorman_assistant_sessions`
- `doorman_assistant_messages`

Every operational table carries `tenant_id` and, when scoped to a property, `condominium_id`.

Row Level Security is enabled on tenant-owned and operational tables. Initial policies use the authenticated user's `profiles` row and condominium memberships to enforce tenant and condominium access boundaries.

## Conventions

- Use UUID primary keys.
- Include `tenant_id` on tenant-owned records.
- Include `condominium_id` on condominium-scoped records.
- Add indexes for tenant and parent lookup paths.
- Keep migrations append-only after they have been applied to shared environments.
- Document generated database types when Supabase type generation is introduced.

## Environment Projects

Supabase environments are tracked separately:

- DEV: `Condominios` / `moriphxbocijjjhnblez` (us-west-2)
- DEV (Anterior): `Condominios` / `fviiwvpcbsriemmxpjxo` (us-west-2)
- DEV (Legado): `kynovia-access-dev` / `gexmghjenqourlovtelj` (sa-east-1)
- STAGING: pending project creation after cost confirmation.
- PROD: pending project creation after cost confirmation.

See `docs/database/supabase-projects.md` for project setup and promotion expectations.

## RLS

See `docs/security/rls-policy-model.md` for the initial policy model.
