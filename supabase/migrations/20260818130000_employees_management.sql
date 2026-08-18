create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  full_name text not null,
  document text,
  role_title text not null,
  department text not null default 'general' check (
    department in (
      'administration',
      'gatehouse',
      'maintenance',
      'cleaning',
      'security',
      'general'
    )
  ),
  phone text,
  email extensions.citext,
  shift_start text not null default '08:00',
  shift_end text not null default '17:00',
  workdays integer[] not null default '{2,3,4,5,6}',
  status text not null default 'active' check (status in ('active', 'inactive', 'vacation', 'terminated')),
  emergency_contact_name text,
  emergency_contact_phone text,
  hire_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

alter table public.employees enable row level security;

create index if not exists employees_tenant_id_idx on public.employees(tenant_id);
create index if not exists employees_condominium_id_idx on public.employees(condominium_id);
create index if not exists employees_department_idx on public.employees(department);
create index if not exists employees_status_idx on public.employees(status);
create index if not exists employees_document_idx on public.employees(document);

drop policy if exists employees_select_accessible on public.employees;
drop policy if exists employees_insert_operators on public.employees;
drop policy if exists employees_update_operators on public.employees;
drop policy if exists employees_delete_operators on public.employees;

create policy employees_select_accessible
  on public.employees
  for select
  to authenticated
  using (public.has_condominium_access(condominium_id));

create policy employees_insert_operators
  on public.employees
  for insert
  to authenticated
  with check (public.can_operate_condominium(condominium_id));

create policy employees_update_operators
  on public.employees
  for update
  to authenticated
  using (public.can_operate_condominium(condominium_id))
  with check (public.can_operate_condominium(condominium_id));

create policy employees_delete_operators
  on public.employees
  for delete
  to authenticated
  using (public.can_operate_condominium(condominium_id));

grant select, insert, update, delete on public.employees to authenticated, service_role;
