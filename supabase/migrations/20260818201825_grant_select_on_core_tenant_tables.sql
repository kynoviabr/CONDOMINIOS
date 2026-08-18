-- Migration: grant_select_on_core_tenant_tables
-- Concede permissao estrita para authenticated nas tabelas de dominio do condominio
-- e funcoes auxiliares de RLS, necessarias para a resolucao de subplanos e politicas.

revoke all on table public.residents from anon;
grant select, insert, update on table public.residents to authenticated;

revoke all on table public.units from anon;
grant select, insert, update on table public.units to authenticated;

revoke all on table public.condominiums from anon;
grant select on table public.condominiums to authenticated;

revoke all on table public.tenants from anon;
grant select on table public.tenants to authenticated;

revoke all on table public.profiles from anon;
grant select, update on table public.profiles to authenticated;

revoke all on table public.condominium_memberships from anon;
grant select, insert, update on table public.condominium_memberships to authenticated;

-- Concessao de EXECUTE estrito para authenticated nas funcoes de checagem RLS
revoke execute on function public.current_tenant_id() from public, anon;
grant execute on function public.current_tenant_id() to authenticated;

revoke execute on function public.can_operate_condominium(uuid) from public, anon;
grant execute on function public.can_operate_condominium(uuid) to authenticated;

revoke execute on function public.has_condominium_access(uuid) from public, anon;
grant execute on function public.has_condominium_access(uuid) to authenticated;

revoke execute on function public.has_tenant_access(uuid) from public, anon;
grant execute on function public.has_tenant_access(uuid) to authenticated;

revoke execute on function public.current_profile_role() from public, anon;
grant execute on function public.current_profile_role() to authenticated;
