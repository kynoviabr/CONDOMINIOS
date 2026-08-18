-- Migration: secure_mobile_pwa_invites_hardening
-- Objetivo:
-- 1. Remover a funcao redundante is_current_resident_for_unit do schema public.
-- 2. Otimizar as politicas RLS de access_invites substituindo chamadas avaliadas por linha por (select auth.uid()) e (select public.current_tenant_id()).
-- 3. Aplicar o principio do menor privilegio, revogando grants excessivos (TRIGGER, REFERENCES, TRUNCATE, DELETE) de authenticated e todo acesso de anon nas tabelas operacionais do PWA.

-- 1. Remocao da funcao redundante SECURITY DEFINER
drop function if exists public.is_current_resident_for_unit(uuid, uuid, uuid);

-- 2. Otimizacao das Politicas RLS para public.access_invites
drop policy if exists access_invites_select_accessible on public.access_invites;
drop policy if exists access_invites_insert_authorized on public.access_invites;
drop policy if exists access_invites_update_authorized on public.access_invites;
drop policy if exists access_invites_delete_operators on public.access_invites;

-- Leitura: Operadores do condominio ou morador titular ativo para sua unidade vinculada
create policy access_invites_select_accessible
  on public.access_invites
  for select
  to authenticated
  using (
    public.can_operate_condominium(condominium_id)
    or (
      tenant_id = (select public.current_tenant_id())
      and exists (
        select 1
        from public.residents r
        join public.resident_units ru on ru.resident_id = r.id
        where r.id = access_invites.resident_id
          and r.profile_id = (select auth.uid())
          and r.status = 'active'
          and r.tenant_id = access_invites.tenant_id
          and r.condominium_id = access_invites.condominium_id
          and ru.unit_id = access_invites.unit_id
          and ru.condominium_id = access_invites.condominium_id
          and ru.tenant_id = access_invites.tenant_id
      )
    )
  );

-- Insercao: Operadores autorizados ou morador ativo para sua propria unidade vinculada
create policy access_invites_insert_authorized
  on public.access_invites
  for insert
  to authenticated
  with check (
    public.can_operate_condominium(condominium_id)
    or (
      tenant_id = (select public.current_tenant_id())
      and exists (
        select 1
        from public.residents r
        join public.resident_units ru on ru.resident_id = r.id
        where r.id = access_invites.resident_id
          and r.profile_id = (select auth.uid())
          and r.status = 'active'
          and r.tenant_id = access_invites.tenant_id
          and r.condominium_id = access_invites.condominium_id
          and ru.unit_id = access_invites.unit_id
          and ru.condominium_id = access_invites.condominium_id
          and ru.tenant_id = access_invites.tenant_id
      )
    )
  );

-- Atualizacao: Operadores ou morador titular cancelando/gerenciando convite de sua unidade
create policy access_invites_update_authorized
  on public.access_invites
  for update
  to authenticated
  using (
    public.can_operate_condominium(condominium_id)
    or (
      tenant_id = (select public.current_tenant_id())
      and exists (
        select 1
        from public.residents r
        join public.resident_units ru on ru.resident_id = r.id
        where r.id = access_invites.resident_id
          and r.profile_id = (select auth.uid())
          and r.status = 'active'
          and r.tenant_id = access_invites.tenant_id
          and r.condominium_id = access_invites.condominium_id
          and ru.unit_id = access_invites.unit_id
          and ru.condominium_id = access_invites.condominium_id
          and ru.tenant_id = access_invites.tenant_id
      )
    )
  )
  with check (
    public.can_operate_condominium(condominium_id)
    or (
      tenant_id = (select public.current_tenant_id())
      and exists (
        select 1
        from public.residents r
        join public.resident_units ru on ru.resident_id = r.id
        where r.id = access_invites.resident_id
          and r.profile_id = (select auth.uid())
          and r.status = 'active'
          and r.tenant_id = access_invites.tenant_id
          and r.condominium_id = access_invites.condominium_id
          and ru.unit_id = access_invites.unit_id
          and ru.condominium_id = access_invites.condominium_id
          and ru.tenant_id = access_invites.tenant_id
      )
    )
  );

-- Exclusao: Estritamente restrita a operadores do condominio (moradores apenas cancelam via UPDATE)
create policy access_invites_delete_operators
  on public.access_invites
  for delete
  to authenticated
  using (public.can_operate_condominium(condominium_id));

-- 3. Auditoria e Restricao Rigorosa de Grants (Menor Privilegio)
-- Revogar completamente acesso de anon a todas as tabelas operacionais do PWA
revoke all on table public.access_invites from anon, authenticated;
grant select, insert, update on table public.access_invites to authenticated;

revoke all on table public.resident_access_approvals from anon, authenticated;
grant select, insert, update on table public.resident_access_approvals to authenticated;

revoke all on table public.resident_favorite_visitors from anon, authenticated;
grant select, insert, update, delete on table public.resident_favorite_visitors to authenticated;

revoke all on table public.resident_units from anon, authenticated;
grant select on table public.resident_units to authenticated;

revoke all on table public.access_events from anon, authenticated;
grant select, insert, update on table public.access_events to authenticated;

revoke all on table public.access_invite_validations from anon, authenticated;
grant select, insert on table public.access_invite_validations to authenticated;

revoke all on table public.visitor_vehicle_accesses from anon, authenticated;
grant select, insert, update on table public.visitor_vehicle_accesses to authenticated;
