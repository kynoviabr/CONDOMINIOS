create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null,
  trade_name text,
  document text,
  category text not null default 'other' check (
    category in (
      'maintenance',
      'cleaning',
      'security',
      'gardening',
      'construction',
      'telecom',
      'delivery',
      'other'
    )
  ),
  contact_name text,
  phone text,
  email extensions.citext,
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked')),
  block_reason text,
  blocked_at timestamptz,
  allowed_weekdays integer[] not null default '{1,2,3,4,5,6,7}',
  allowed_time_start text not null default '08:00',
  allowed_time_end text not null default '18:00',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;

create index if not exists suppliers_tenant_id_idx on public.suppliers(tenant_id);
create index if not exists suppliers_condominium_id_idx on public.suppliers(condominium_id);
create index if not exists suppliers_category_idx on public.suppliers(category);
create index if not exists suppliers_status_idx on public.suppliers(status);
create index if not exists suppliers_document_idx on public.suppliers(document);

drop policy if exists suppliers_select_accessible on public.suppliers;
drop policy if exists suppliers_insert_operators on public.suppliers;
drop policy if exists suppliers_update_operators on public.suppliers;
drop policy if exists suppliers_delete_operators on public.suppliers;

create policy suppliers_select_accessible
  on public.suppliers
  for select
  to authenticated
  using (public.has_condominium_access(condominium_id));

create policy suppliers_insert_operators
  on public.suppliers
  for insert
  to authenticated
  with check (public.can_operate_condominium(condominium_id));

create policy suppliers_update_operators
  on public.suppliers
  for update
  to authenticated
  using (public.can_operate_condominium(condominium_id))
  with check (public.can_operate_condominium(condominium_id));

create policy suppliers_delete_operators
  on public.suppliers
  for delete
  to authenticated
  using (public.can_operate_condominium(condominium_id));

grant select, insert, update, delete on public.suppliers to authenticated, service_role;
