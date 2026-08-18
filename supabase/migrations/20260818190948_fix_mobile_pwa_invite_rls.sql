-- Migration: fix_mobile_pwa_invite_rls
-- Objetivo: Corrigir e blindar as políticas RLS de access_invites e funções auxiliares,
-- aplicando o princípio do menor privilégio sem expor service_role e sem atalhos inseguros.

-- 1. Recriar função auxiliar segura com validação estrita de auth.uid() e search_path fixo
create or replace function public.is_current_resident_for_unit(
  target_resident_id uuid,
  target_unit_id uuid,
  target_condominium_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.residents r
    join public.resident_units ru on ru.resident_id = r.id
    where r.id = target_resident_id
      and r.profile_id = auth.uid()
      and r.status = 'active'
      and r.condominium_id = target_condominium_id
      and ru.unit_id = target_unit_id
      and ru.condominium_id = target_condominium_id
  );
$$;

-- Conceder EXECUTE estritamente a authenticated e revogar de anon e public
revoke execute on function public.is_current_resident_for_unit(uuid, uuid, uuid) from public, anon;
grant execute on function public.is_current_resident_for_unit(uuid, uuid, uuid) to authenticated;

-- 2. Recriar políticas de RLS para public.access_invites com validação simultânea de tenancy, perfil e unidade
drop policy if exists access_invites_insert_authorized on public.access_invites;
drop policy if exists access_invites_update_authorized on public.access_invites;
drop policy if exists access_invites_select_accessible on public.access_invites;
drop policy if exists access_invites_delete_operators on public.access_invites;

-- Leitura: Operadores do condomínio ou o próprio morador vinculado
create policy access_invites_select_accessible
  on public.access_invites
  for select
  to authenticated
  using (
    public.can_operate_condominium(condominium_id)
    or (
      tenant_id = public.current_tenant_id()
      and exists (
        select 1
        from public.residents r
        join public.resident_units ru on ru.resident_id = r.id
        where r.id = access_invites.resident_id
          and r.profile_id = auth.uid()
          and r.status = 'active'
          and r.tenant_id = access_invites.tenant_id
          and r.condominium_id = access_invites.condominium_id
          and ru.unit_id = access_invites.unit_id
          and ru.condominium_id = access_invites.condominium_id
          and ru.tenant_id = access_invites.tenant_id
      )
    )
  );

-- Inserção: Operadores autorizados ou moradores ativos inserindo para sua própria unidade
create policy access_invites_insert_authorized
  on public.access_invites
  for insert
  to authenticated
  with check (
    public.can_operate_condominium(condominium_id)
    or (
      tenant_id = public.current_tenant_id()
      and exists (
        select 1
        from public.residents r
        join public.resident_units ru on ru.resident_id = r.id
        where r.id = access_invites.resident_id
          and r.profile_id = auth.uid()
          and r.status = 'active'
          and r.tenant_id = access_invites.tenant_id
          and r.condominium_id = access_invites.condominium_id
          and ru.unit_id = access_invites.unit_id
          and ru.condominium_id = access_invites.condominium_id
          and ru.tenant_id = access_invites.tenant_id
      )
    )
  );

-- Atualização: Operadores ou o morador responsável (ex: cancelamento de convite)
create policy access_invites_update_authorized
  on public.access_invites
  for update
  to authenticated
  using (
    public.can_operate_condominium(condominium_id)
    or (
      tenant_id = public.current_tenant_id()
      and exists (
        select 1
        from public.residents r
        join public.resident_units ru on ru.resident_id = r.id
        where r.id = access_invites.resident_id
          and r.profile_id = auth.uid()
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
      tenant_id = public.current_tenant_id()
      and exists (
        select 1
        from public.residents r
        join public.resident_units ru on ru.resident_id = r.id
        where r.id = access_invites.resident_id
          and r.profile_id = auth.uid()
          and r.status = 'active'
          and r.tenant_id = access_invites.tenant_id
          and r.condominium_id = access_invites.condominium_id
          and ru.unit_id = access_invites.unit_id
          and ru.condominium_id = access_invites.condominium_id
          and ru.tenant_id = access_invites.tenant_id
      )
    )
  );

-- Exclusão: Estritamente restrita a operadores do condomínio
create policy access_invites_delete_operators
  on public.access_invites
  for delete
  to authenticated
  using (public.can_operate_condominium(condominium_id));

-- 3. Revisão e Restrição de Privilégios (Princípio do Menor Acesso)
-- Revogar privilégios excessivos do papel anon em todas as tabelas sensíveis de convites e acessos
revoke all on table public.access_invites from anon;
revoke truncate on table public.access_invites from authenticated;
grant select, insert, update on table public.access_invites to authenticated;

revoke all on table public.resident_access_approvals from anon;
revoke truncate on table public.resident_access_approvals from authenticated;
grant select, insert, update on table public.resident_access_approvals to authenticated;

revoke all on table public.access_invite_validations from anon;
revoke truncate on table public.access_invite_validations from authenticated;
grant select, insert on table public.access_invite_validations to authenticated;

revoke all on table public.resident_favorite_visitors from anon;
revoke truncate on table public.resident_favorite_visitors from authenticated;
grant select, insert, update, delete on table public.resident_favorite_visitors to authenticated;

revoke all on table public.visitor_vehicle_accesses from anon;
revoke truncate on table public.visitor_vehicle_accesses from authenticated;
grant select, insert, update on table public.visitor_vehicle_accesses to authenticated;
