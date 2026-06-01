# SaaS Admin And Condominium Portal Separation

## Purpose

This document defines the architectural refactoring phase required to separate two domains that are currently mixed inside `apps/web-admin`:

1. **Kynovia Admin**: internal SaaS backoffice used by Kynovia to create, onboard, support, audit, and manage all condominium customers.
2. **Condo Admin**: customer-facing administrative portal used by each condominium to manage its own operational data.

This document started as a planning artifact and now tracks the migration baseline. It does not authorize broad feature work, migration changes, Supabase DEV changes, or data movement outside focused PRs.

## Current Diagnosis

`apps/web-admin` currently combines SaaS-level and condominium-level responsibilities in one application shell.

### Current Screens And Ownership

| Current path | Current responsibility | Target application | Notes |
| --- | --- | --- | --- |
| `/login` | Administrative sign-in | Shared initially, then duplicated/adapted per app | Both apps need auth, but post-login routing and copy must differ. |
| `/dashboard` | Generic admin landing | Split | Kynovia Admin dashboard should show portfolio/onboarding/support. Condo Admin dashboard should show one condominium operation. |
| `/dashboard/condominiums` | List/create condominiums | `apps/kynovia-admin` | SaaS-level tenant/customer management. |
| `/dashboard/condominiums/[condominiumId]` | Condominium settings, units, gates, deletion | Split | Global lifecycle/support belongs to Kynovia Admin. Customer settings, units, and gates belong to Condo Admin. |
| `/dashboard/condominiums/[condominiumId]/residents` | Residents, resident-unit links, resident vehicles | `apps/condo-admin` | Operational customer data scoped to one condominium. |
| `/dashboard/condominiums/[condominiumId]/visitors` | Visitor registry, visitor vehicles, visit history | `apps/condo-admin` | Operational customer data scoped to one condominium. |
| `/dashboard/condominiums/[condominiumId]/invites` | Digital invites | `apps/condo-admin` | Operational customer workflow. |
| shared actions under `apps/web-admin/src/app/dashboard/condominiums` | Mixed server actions | Split | Actions must move with their domain and keep RLS validation. |

### Backoffice Kynovia Responsibilities

Kynovia Admin should own:

- Customer/tenant portfolio overview.
- Condominium onboarding and lifecycle.
- Plan, environment, support, and deployment status.
- Internal operational audit and support diagnostics.
- Cross-condominium reporting where allowed by RBAC.
- Creation of the initial condominium admin user and handoff process.
- SaaS-level settings and support-only tooling.

Kynovia Admin must not implement detailed operational management for residents, vehicles, visitors, units, portaria flows, or day-to-day condominium workflows except as support read-only views explicitly designed for internal support.

### Condo Admin Responsibilities

Condo Admin should own:

- One-condominium administrative dashboard.
- Condominium settings visible to the customer.
- Units and resident-unit links.
- Residents and resident vehicles.
- Visitors, suppliers, employees, and recurring access records.
- Digital invites and QR/plate authorization management.
- Gates/access points visible to condominium administrators.
- Occurrences and operational reports relevant to the condominium.

Condo Admin must only manage data for the condominium context resolved for the authenticated user.

### Existing Apps After Separation

| App | Primary user | Responsibility |
| --- | --- | --- |
| `apps/kynovia-admin` | Kynovia internal team | SaaS backoffice, onboarding, support, customer lifecycle. |
| `apps/condo-admin` | Condominium administrators | Customer-facing condominium administration. |
| `apps/web-admin` | Temporary legacy users | Existing mixed admin functionality until workflows are migrated. |
| `apps/web-portaria` | Gatehouse operators | Real-time gatehouse operation. |
| `apps/mobile-pwa` | Residents | Resident mobile/PWA workflows. |

### Scaffold Status

The first implementation step creates `apps/kynovia-admin` and `apps/condo-admin` as separate Next.js app shells. Both apps include:

- TypeScript, Tailwind, Next.js, and pnpm/Turbo-compatible scripts.
- Supabase SSR session plumbing consistent with the existing apps.
- Basic login, reset password, access denied, and protected dashboard routes.
- App-level RBAC through `@kynovia/auth`.

No operational workflows are migrated in this scaffold step. `apps/web-admin` remains intact as the legacy source until each route is moved deliberately.

### Shared UI Extraction Status

The second implementation step extracts repeated admin shell primitives into `@kynovia/ui` for the new separated apps. Shared primitives now cover:

- Auth/app panel layout.
- Login form shell.
- Reset password form shell.
- Access denied shell.
- Authenticated dashboard shell.
- Profile summary display.

This extraction keeps app-specific copy, RBAC, routes, and server actions inside each app. It does not migrate existing `apps/web-admin` workflows or introduce new product functionality.

### SaaS Backoffice Workflow Migration Status

The first migrated SaaS workflow adds the condominium customer portfolio to `apps/kynovia-admin`.
This includes listing and creating condominium customer records for onboarding. It intentionally does
not migrate operational management of units, gates, residents, visitors, invites, or settings. Those
remain in `apps/web-admin` until they are moved to `apps/condo-admin` in dedicated PRs.

The Kynovia Admin customer area is now split into explicit SaaS responsibilities:

- `/dashboard/condominiums`: customer portfolio and navigation to existing customer records.
- `/dashboard/condominiums/new`: new customer onboarding and creation of the first condominium administrator.
- `/dashboard/condominiums/[condominiumId]`: customer registration data and administrator access management only.
- `/dashboard/finance`: SaaS financial dashboard for active/inactive customers, total received, and payment totals by customer.
- `/dashboard/finance/[condominiumId]`: customer financial controls, payment registration, charge channel, and access blocking/unblocking.

Customer registration and administrator management must not contain financial forms. Financial
status, payment history, charge handling, and access blocking must stay in the finance area so
commercial/customer administration and billing operations remain independently navigable.

### Condo Admin Workflow Migration Status

The first migrated condominium workflow establishes a server-side active condominium context in
`apps/condo-admin` and adds the first customer-facing operational screens:

- `/dashboard`: condominium-scoped landing page.
- `/dashboard/settings`: basic condominium name, timezone, and visitor parking capacity.
- `/dashboard/units`: condominium-scoped unit listing, search, create, update, and delete.
- `/dashboard/residents`: condominium-scoped residents, resident-unit links, and resident
  vehicles.
- `/dashboard/visitors`: condominium-scoped visitor registry, visitor plates, and visit history.
- `/dashboard/invites`: condominium-scoped invite history, validations, visitor parking occupancy,
  and plate blacklist management.
- `/dashboard/gates`: condominium-scoped access point configuration and recent gate commands.
- `/dashboard/occurrences`: condominium-scoped administrative occurrence records.

`Funcionarios` and `Fornecedores` remain planned modules because the current versioned database
schema does not yet include dedicated tables for those domains.

This intentionally avoids exposing raw JSON settings to condominium administrators. Advanced
technical settings remain hidden until they can be represented as explicit, validated controls.

The current context resolution prefers a `condominium_admin` membership when present. For
`tenant_admin`, it uses the first accessible condominium in the tenant as an interim bridge while
the product finalizes single-condominium account provisioning and any future multi-condominium
selector requirements.

## Proposed Architecture

```text
apps/
  kynovia-admin/
    src/app/
      dashboard/
      condominiums/
      onboarding/
      support/
      audit/
      settings/

  condo-admin/
    src/app/
      dashboard/
      settings/
      units/
      residents/
      vehicles/
      visitors/
      suppliers/
      employees/
      invites/
      gates/
      occurrences/

  web-portaria/
  mobile-pwa/
```

Shared behavior should remain in packages:

- `@kynovia/auth`: role checks, app access guards, profile resolution, condominium context resolution.
- `@kynovia/database`: database types, normalization helpers, query helpers.
- `@kynovia/ui`: shared app shell primitives, tables, badges, forms, cards, dialogs, and drawers.
- `@kynovia/access-engine`: access decision contracts.
- `@kynovia/integrations`: provider contracts.

## RBAC Direction

The split should be enforced by both routing and database policies.

| Role | Kynovia Admin | Condo Admin | Portaria | Mobile PWA |
| --- | --- | --- | --- | --- |
| `platform_admin` | Full internal access | Support-only if explicitly allowed | No default operational use | No |
| `tenant_admin` | No default access | Full admin for own condominium/tenant scope | No default portaria use | No |
| `condominium_admin` | No | Admin for assigned condominium | No default portaria use | No |
| `gatehouse_operator` | No | No admin workflows | Real-time operation only | No |
| `resident` | No | No | No | Resident workflows only |

The first implementation can keep tenant-level checks where the existing schema requires it, but the target state for Condo Admin is a resolved `condominium_id` context for every operational screen.

## Migration Plan

### Step 1: Freeze Scope And Add Architecture Documentation

- Document the ownership split.
- Create backlog issues.
- Do not move files yet.
- Do not change migrations.

### Step 2: Scaffold New Apps

- Create `apps/kynovia-admin`.
- Create `apps/condo-admin`.
- Copy only the minimal Next.js app shell, environment contracts, auth guard shape, and build scripts.
- Keep `apps/web-admin` temporarily as legacy/reference.
- Use local dev ports `3003` for Kynovia Admin and `3004` for Condo Admin.

### Step 3: Extract Shared App Shell And UI

- Move reusable layout primitives to `@kynovia/ui`.
- Keep app-specific navigation in each app.
- Avoid cross-app imports from one app into another app.

### Step 4: Migrate Kynovia Backoffice Workflows

- Move condominium portfolio/list/create flows to `apps/kynovia-admin`.
- Move onboarding/support/audit views to `apps/kynovia-admin`.
- Restrict write access to `platform_admin`.

### Step 5: Migrate Condo Operational Workflows

- Move settings, units, residents, resident vehicles, visitors, invites, gates, suppliers, employees, and occurrences to `apps/condo-admin`.
- Resolve the active condominium context server-side.
- Remove multi-condominium selectors from customer-facing screens unless a user legitimately manages multiple assigned condominiums.

### Step 6: Tighten RBAC And RLS Validation

- Add app-level auth guards for each app.
- Validate every screen against expected roles.
- Validate RLS for all operational tables by app/profile.
- Document any policy gaps before creating migrations.

### Step 7: Retire Or Rename Legacy `apps/web-admin`

- Once both apps are validated, remove or convert `apps/web-admin` into a redirect/reference shell in a dedicated PR.
- Update Vercel projects and docs.

## Non-Goals For This Phase

- No feature implementation.
- No migrations.
- No Supabase DEV changes.
- No data movement.
- No production deployment changes.
- No hardware integration changes.

## Risks

- **RBAC ambiguity**: existing `tenant_admin` behavior may be too broad for single-condominium administration.
- **Route coupling**: server actions currently live close to nested routes and may need careful extraction.
- **UI duplication**: duplicating app shells before shared UI primitives are extracted could create drift.
- **RLS mismatch**: tenant-scoped queries may accidentally remain in Condo Admin screens that should be condominium-scoped.
- **Deployment drift**: Vercel projects and environment variables must be updated deliberately for new apps.

## Recommended PR Sequence

1. **Plan SaaS admin and condominium portal separation**
   - Add this document.
   - Update agent rules.
   - Create backlog issues.

2. **Create separated SaaS admin app shells**
   - Add `apps/kynovia-admin`.
   - Add `apps/condo-admin`.
   - Add app shells, scripts, protected dashboard routes, and validation.

3. **Extract shared admin UI primitives**
   - Move reusable auth/dashboard shell primitives into `@kynovia/ui`.
   - Keep app-specific copy, routes, RBAC, and server actions in each app.

4. **Migrate SaaS backoffice workflows to Kynovia Admin**
   - Move condominium portfolio/create/support views.
   - Keep operational workflows out.

5. **Migrate condominium settings and units to Condo Admin**
   - Establish resolved condominium context.
   - Move basic customer-facing settings and unit CRUD out of the legacy mixed app.

6. **Migrate residents, vehicles, visitors, and invites to Condo Admin**
   - Validate RLS and route guards.
   - Migrate residents and resident vehicles before visitor and invite workflows.
   - Keep invite creation flows for resident/mobile and focused operational PRs.

7. **Migrate gates, suppliers, employees, and occurrences to Condo Admin**
   - Keep gatehouse real-time operation in `web-portaria`.
   - Migrate gates and occurrences first because they are already represented in the schema.
   - Add suppliers and employees only after dedicated migrations and RLS are designed.

8. **Adjust RBAC and app access guards**
   - Enforce app-level access by role.

9. **Update deployment docs and Vercel project plan**
    - Document separate Vercel projects for `kynovia-admin` and `condo-admin`.

10. **Retire legacy web-admin**
    - Remove or redirect `apps/web-admin` after parity validation.

## Acceptance Criteria For The Refactoring Epic

- Kynovia Admin cannot perform detailed operational management as a primary workflow.
- Condo Admin cannot access multi-condominium SaaS backoffice workflows.
- Portaria remains focused on real-time gatehouse operation.
- Mobile PWA remains focused on resident workflows.
- RLS and app guards are validated for every migrated workflow.
- No customer-facing app depends on service role keys.

## Condo Admin Operational UX Structure

The Condo Admin uses a fixed left sidebar and a condominium-scoped main area. The sidebar exposes
only operational modules for the authenticated condominium context:

- Configuracoes
- Unidades
- Moradores
- Veiculos
- Portoes e Cancelas
- Funcionarios
- Prestadores de Servico
- Areas Comuns
- Vagas Visitantes

The top bar must identify the active condominium with a logo/initials mark and the condominium
name. Condo Admin must not expose Kynovia customer portfolio, SaaS finance, contracts, or any
multi-condominium selector.

Current schema reuse:

- `condominiums.metadata` stores customer-facing general data such as CNPJ, address, contact
  fields, and WhatsApp until a dedicated normalized customer profile schema is approved.
- `condominiums.visitor_parking_capacity` remains the source for total visitor parking capacity.
- `units`, `residents`, `resident_units`, `resident_vehicles`, and `access_points` remain the
  operational source tables for existing CRUD foundations.
- Areas comuns, funcionarios, and prestadores stay in foundation UX state until dedicated schema
  and RLS are designed.
