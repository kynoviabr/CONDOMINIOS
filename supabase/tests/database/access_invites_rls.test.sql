begin;
select plan(14);

-- 1. Setup Deterministic Test Fixtures in public schema
-- Tenants
insert into public.tenants (id, name, slug)
values
  ('11111111-0000-0000-0000-000000000001', 'Tenant RLS Alpha', 'tenant-rls-alpha'),
  ('22222222-0000-0000-0000-000000000002', 'Tenant RLS Beta', 'tenant-rls-beta')
on conflict (id) do nothing;

-- Condominiums
insert into public.condominiums (id, tenant_id, name, slug, timezone)
values
  ('11111111-0000-0000-0000-000000000101', '11111111-0000-0000-0000-000000000001', 'Condo Alpha 1', 'condo-alpha-1', 'America/Sao_Paulo'),
  ('22222222-0000-0000-0000-000000000102', '22222222-0000-0000-0000-000000000002', 'Condo Beta 2', 'condo-beta-2', 'America/Sao_Paulo')
on conflict (id) do nothing;

-- Units in Condo Alpha 1
insert into public.units (id, tenant_id, condominium_id, block, number, floor)
values
  ('11111111-0000-0000-0000-000000000301', '11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', 'G', '31', '3'),
  ('11111111-0000-0000-0000-000000000302', '11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', 'G', '32', '3')
on conflict (id) do nothing;

-- Auth Users and Profiles
-- User 1: Active Resident 1 (Unit 31)
insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'resident1@kynovia.test')
on conflict (id) do nothing;

insert into public.profiles (id, tenant_id, full_name, role)
values ('11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000001', 'Resident 1 Alpha', 'resident')
on conflict (id) do nothing;

insert into public.condominium_memberships (tenant_id, condominium_id, profile_id, role)
values ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', '11111111-1111-1111-1111-111111111111', 'resident')
on conflict (condominium_id, profile_id) do nothing;

insert into public.residents (id, tenant_id, condominium_id, profile_id, full_name, document, status)
values ('11111111-0000-0000-0000-000000000401', '11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', '11111111-1111-1111-1111-111111111111', 'Resident 1 Alpha', '11111111111', 'active')
on conflict (id) do nothing;

insert into public.resident_units (tenant_id, condominium_id, resident_id, unit_id, relationship, is_primary)
values ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', '11111111-0000-0000-0000-000000000401', '11111111-0000-0000-0000-000000000301', 'owner', true)
on conflict (resident_id, unit_id) do nothing;

-- User 2: Active Resident 2 (Unit 32)
insert into auth.users (id, email)
values ('22222222-2222-2222-2222-222222222222', 'resident2@kynovia.test')
on conflict (id) do nothing;

insert into public.profiles (id, tenant_id, full_name, role)
values ('22222222-2222-2222-2222-222222222222', '11111111-0000-0000-0000-000000000001', 'Resident 2 Alpha', 'resident')
on conflict (id) do nothing;

insert into public.condominium_memberships (tenant_id, condominium_id, profile_id, role)
values ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', '22222222-2222-2222-2222-222222222222', 'resident')
on conflict (condominium_id, profile_id) do nothing;

insert into public.residents (id, tenant_id, condominium_id, profile_id, full_name, document, status)
values ('22222222-0000-0000-0000-000000000402', '11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', '22222222-2222-2222-2222-222222222222', 'Resident 2 Alpha', '22222222222', 'active')
on conflict (id) do nothing;

insert into public.resident_units (tenant_id, condominium_id, resident_id, unit_id, relationship, is_primary)
values ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', '22222222-0000-0000-0000-000000000402', '11111111-0000-0000-0000-000000000302', 'owner', true)
on conflict (resident_id, unit_id) do nothing;

-- User 3: Inactive Resident
insert into auth.users (id, email)
values ('33333333-3333-3333-3333-333333333333', 'inactive@kynovia.test')
on conflict (id) do nothing;

insert into public.profiles (id, tenant_id, full_name, role)
values ('33333333-3333-3333-3333-333333333333', '11111111-0000-0000-0000-000000000001', 'Resident Inactive', 'resident')
on conflict (id) do nothing;

insert into public.condominium_memberships (tenant_id, condominium_id, profile_id, role)
values ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', '33333333-3333-3333-3333-333333333333', 'resident')
on conflict (condominium_id, profile_id) do nothing;

insert into public.residents (id, tenant_id, condominium_id, profile_id, full_name, document, status)
values ('33333333-0000-0000-0000-000000000403', '11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', '33333333-3333-3333-3333-333333333333', 'Resident Inactive', '33333333333', 'inactive')
on conflict (id) do nothing;

insert into public.resident_units (tenant_id, condominium_id, resident_id, unit_id, relationship, is_primary)
values ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', '33333333-0000-0000-0000-000000000403', '11111111-0000-0000-0000-000000000301', 'tenant', false)
on conflict (resident_id, unit_id) do nothing;

-- User 4: Authenticated user without residential link
insert into auth.users (id, email)
values ('44444444-4444-4444-4444-444444444444', 'unlinked@kynovia.test')
on conflict (id) do nothing;

insert into public.profiles (id, tenant_id, full_name, role)
values ('44444444-4444-4444-4444-444444444444', '11111111-0000-0000-0000-000000000001', 'Unlinked User', 'resident')
on conflict (id) do nothing;

-- User 5: Authorized Condominium Operator
insert into auth.users (id, email)
values ('55555555-5555-5555-5555-555555555555', 'operator@kynovia.test')
on conflict (id) do nothing;

insert into public.profiles (id, tenant_id, full_name, role)
values ('55555555-5555-5555-5555-555555555555', '11111111-0000-0000-0000-000000000001', 'Operator User', 'condominium_admin')
on conflict (id) do nothing;

insert into public.condominium_memberships (tenant_id, condominium_id, profile_id, role)
values ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000101', '55555555-5555-5555-5555-555555555555', 'condominium_admin')
on conflict (condominium_id, profile_id) do nothing;

-- Pre-seed an invite for Resident 2 so we can test visibility and cross-resident updates
insert into public.access_invites (
  id, tenant_id, condominium_id, unit_id, resident_id, visitor_name, starts_at, expires_at, qr_token_hash, status
) values (
  '22222222-0000-0000-0000-000000000999',
  '11111111-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000101',
  '11111111-0000-0000-0000-000000000302',
  '22222222-0000-0000-0000-000000000402',
  'Visitante Morador 2',
  now(),
  now() + interval '4 hours',
  '2222222222222222222222222222222222222222222222222222222222222222',
  'active'
) on conflict (id) do nothing;

-- Helper functions for switching auth context in pgTAP
create or replace function pg_temp.set_auth(user_id uuid) returns void as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_id::text, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

create or replace function pg_temp.set_anon() returns void as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end;
$$ language plpgsql;

create or replace function pg_temp.set_admin() returns void as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$ language plpgsql;

create or replace function pg_temp.try_update_other_invite() returns integer as $$
declare
  updated_count integer;
begin
  with updated as (
    update public.access_invites
    set status = 'cancelled'
    where id = '22222222-0000-0000-0000-000000000999'
    returning 1
  )
  select count(*)::integer into updated_count from updated;
  return updated_count;
end;
$$ language plpgsql;

--------------------------------------------------------------------------------
-- CENÁRIO 1: Morador ativo cria convite para sua própria unidade vinculada (Permitido)
--------------------------------------------------------------------------------
select pg_temp.set_auth('11111111-1111-1111-1111-111111111111'::uuid);

select lives_ok(
  $$
    insert into public.access_invites (
      id, tenant_id, condominium_id, unit_id, resident_id, visitor_name, starts_at, expires_at, qr_token_hash, status
    ) values (
      '11111111-0000-0000-0000-000000000901',
      '11111111-0000-0000-0000-000000000001',
      '11111111-0000-0000-0000-000000000101',
      '11111111-0000-0000-0000-000000000301',
      '11111111-0000-0000-0000-000000000401',
      'Visitante Teste 1',
      now(),
      now() + interval '4 hours',
      '1111111111111111111111111111111111111111111111111111111111111111',
      'active'
    )
  $$,
  '1. morador ativo cria convite para sua unidade vinculada: permitido'
);

--------------------------------------------------------------------------------
-- CENÁRIO 2: Morador criando convite para unidade de outro morador (Negado pela RLS)
--------------------------------------------------------------------------------
select pg_temp.set_auth('11111111-1111-1111-1111-111111111111'::uuid);

select throws_ok(
  $$
    insert into public.access_invites (
      id, tenant_id, condominium_id, unit_id, resident_id, visitor_name, starts_at, expires_at, qr_token_hash, status
    ) values (
      '11111111-0000-0000-0000-000000000902',
      '11111111-0000-0000-0000-000000000001',
      '11111111-0000-0000-0000-000000000101',
      '11111111-0000-0000-0000-000000000302', -- Unidade 32 (não pertence ao Resident 1)
      '11111111-0000-0000-0000-000000000401',
      'Tentativa Outra Unidade',
      now(),
      now() + interval '4 hours',
      '1111111111111111111111111111111111111111111111111111111111111112',
      'active'
    )
  $$,
  '42501',
  NULL,
  '2. convite para unidade de outro morador: negado por RLS (WITH CHECK)'
);

--------------------------------------------------------------------------------
-- CENÁRIO 3: Convite para outro condomínio (Negado pela RLS)
--------------------------------------------------------------------------------
select pg_temp.set_auth('11111111-1111-1111-1111-111111111111'::uuid);

select throws_ok(
  $$
    insert into public.access_invites (
      id, tenant_id, condominium_id, unit_id, resident_id, visitor_name, starts_at, expires_at, qr_token_hash, status
    ) values (
      '11111111-0000-0000-0000-000000000903',
      '11111111-0000-0000-0000-000000000001',
      '22222222-0000-0000-0000-000000000102', -- Condominio Beta 2
      '11111111-0000-0000-0000-000000000301',
      '11111111-0000-0000-0000-000000000401',
      'Tentativa Outro Condominio',
      now(),
      now() + interval '4 hours',
      '1111111111111111111111111111111111111111111111111111111111111113',
      'active'
    )
  $$,
  '42501',
  NULL,
  '3. convite para outro condomínio: negado por RLS (WITH CHECK)'
);

--------------------------------------------------------------------------------
-- CENÁRIO 4: Convite para outro tenant (Negado pela RLS)
--------------------------------------------------------------------------------
select pg_temp.set_auth('11111111-1111-1111-1111-111111111111'::uuid);

select throws_ok(
  $$
    insert into public.access_invites (
      id, tenant_id, condominium_id, unit_id, resident_id, visitor_name, starts_at, expires_at, qr_token_hash, status
    ) values (
      '11111111-0000-0000-0000-000000000904',
      '22222222-0000-0000-0000-000000000002', -- Tenant Beta
      '11111111-0000-0000-0000-000000000101',
      '11111111-0000-0000-0000-000000000301',
      '11111111-0000-0000-0000-000000000401',
      'Tentativa Outro Tenant',
      now(),
      now() + interval '4 hours',
      '1111111111111111111111111111111111111111111111111111111111111114',
      'active'
    )
  $$,
  '42501',
  NULL,
  '4. convite para outro tenant: negado por RLS (WITH CHECK)'
);

--------------------------------------------------------------------------------
-- CENÁRIO 5: Morador inativo cria convite (Negado pela RLS)
--------------------------------------------------------------------------------
select pg_temp.set_auth('33333333-3333-3333-3333-333333333333'::uuid);

select throws_ok(
  $$
    insert into public.access_invites (
      id, tenant_id, condominium_id, unit_id, resident_id, visitor_name, starts_at, expires_at, qr_token_hash, status
    ) values (
      '11111111-0000-0000-0000-000000000905',
      '11111111-0000-0000-0000-000000000001',
      '11111111-0000-0000-0000-000000000101',
      '11111111-0000-0000-0000-000000000301',
      '33333333-0000-0000-0000-000000000403',
      'Visitante Inativo',
      now(),
      now() + interval '4 hours',
      '1111111111111111111111111111111111111111111111111111111111111115',
      'active'
    )
  $$,
  '42501',
  NULL,
  '5. morador inativo cria convite: negado por RLS (status inactive)'
);

--------------------------------------------------------------------------------
-- CENÁRIO 6: Usuário autenticado sem vínculo cria convite (Negado pela RLS)
--------------------------------------------------------------------------------
select pg_temp.set_auth('44444444-4444-4444-4444-444444444444'::uuid);

select throws_ok(
  $$
    insert into public.access_invites (
      id, tenant_id, condominium_id, unit_id, resident_id, visitor_name, starts_at, expires_at, qr_token_hash, status
    ) values (
      '11111111-0000-0000-0000-000000000906',
      '11111111-0000-0000-0000-000000000001',
      '11111111-0000-0000-0000-000000000101',
      '11111111-0000-0000-0000-000000000301',
      '11111111-0000-0000-0000-000000000401',
      'Visitante Sem Vinculo',
      now(),
      now() + interval '4 hours',
      '1111111111111111111111111111111111111111111111111111111111111116',
      'active'
    )
  $$,
  '42501',
  NULL,
  '6. autenticado sem vínculo cria convite: negado por RLS'
);

--------------------------------------------------------------------------------
-- CENÁRIO 7: Anon consulta convites (Negado: sem grant de SELECT)
--------------------------------------------------------------------------------
select pg_temp.set_anon();

select throws_ok(
  $$ select count(*)::integer from public.access_invites $$,
  '42501',
  NULL,
  '7. anon consulta convites: negado (permissao revogada por menor privilegio)'
);

--------------------------------------------------------------------------------
-- CENÁRIO 8: Anon cria convite (Negado: sem privilégio de INSERT)
--------------------------------------------------------------------------------
select pg_temp.set_anon();

select throws_ok(
  $$
    insert into public.access_invites (
      id, tenant_id, condominium_id, unit_id, resident_id, visitor_name, starts_at, expires_at, qr_token_hash, status
    ) values (
      '11111111-0000-0000-0000-000000000908',
      '11111111-0000-0000-0000-000000000001',
      '11111111-0000-0000-0000-000000000101',
      '11111111-0000-0000-0000-000000000301',
      '11111111-0000-0000-0000-000000000401',
      'Visitante Anon',
      now(),
      now() + interval '4 hours',
      '1111111111111111111111111111111111111111111111111111111111111118',
      'active'
    )
  $$,
  '42501',
  NULL,
  '8. anon cria convite: negado por ausencia de grant INSERT'
);

--------------------------------------------------------------------------------
-- CENÁRIO 9: Morador consulta somente seus convites (Permitido: vê convite da sua unidade)
--------------------------------------------------------------------------------
select pg_temp.set_auth('11111111-1111-1111-1111-111111111111'::uuid);

select is(
  (select count(*)::integer from public.access_invites where id = '11111111-0000-0000-0000-000000000901'),
  1,
  '9. morador consulta somente seus convites: permitido'
);

--------------------------------------------------------------------------------
-- CENÁRIO 10: Morador não consulta convite de outro morador (Invisível por RLS: 0 rows)
--------------------------------------------------------------------------------
select pg_temp.set_auth('11111111-1111-1111-1111-111111111111'::uuid);

select is(
  (select count(*)::integer from public.access_invites where id = '22222222-0000-0000-0000-000000000999'),
  0,
  '10. morador não consulta convite de outro morador: negado (0 rows visiveis por RLS)'
);

--------------------------------------------------------------------------------
-- CENÁRIO 11: Morador atualiza/cancela seu próprio convite (Permitido)
--------------------------------------------------------------------------------
select pg_temp.set_auth('11111111-1111-1111-1111-111111111111'::uuid);

select lives_ok(
  $$ update public.access_invites set status = 'cancelled' where id = '11111111-0000-0000-0000-000000000901' $$,
  '11. morador atualiza/cancela seu convite: permitido'
);

--------------------------------------------------------------------------------
-- CENÁRIO 12: Morador atualiza convite de outro morador (Negado: 0 rows afetadas)
--------------------------------------------------------------------------------
select pg_temp.set_auth('11111111-1111-1111-1111-111111111111'::uuid);

select is(
  pg_temp.try_update_other_invite(),
  0,
  '12. morador atualiza convite de outro morador: negado (0 rows afetadas)'
);

--------------------------------------------------------------------------------
-- CENÁRIO 13: Morador executa DELETE (Negado: sem grant DELETE concedido)
--------------------------------------------------------------------------------
select pg_temp.set_auth('11111111-1111-1111-1111-111111111111'::uuid);

select throws_ok(
  $$ delete from public.access_invites where id = '11111111-0000-0000-0000-000000000901' $$,
  '42501',
  NULL,
  '13. morador executa DELETE: negado por menor privilegio (sem grant DELETE)'
);

--------------------------------------------------------------------------------
-- CENÁRIO 14: Operador autorizado executa operações permitidas (Permitido)
--------------------------------------------------------------------------------
select pg_temp.set_auth('55555555-5555-5555-5555-555555555555'::uuid);

select lives_ok(
  $$
    select count(*) from public.access_invites where condominium_id = '11111111-0000-0000-0000-000000000101'
  $$,
  '14. operador autorizado executa operações permitidas: permitido'
);

select * from finish();
rollback;
