alter table public.condominiums
  add column if not exists unit_registration_mode text;

alter table public.condominiums
  drop constraint if exists condominiums_unit_registration_mode_check;

alter table public.condominiums
  add constraint condominiums_unit_registration_mode_check
  check (unit_registration_mode is null or unit_registration_mode in ('vertical', 'horizontal'));

update public.condominiums
set unit_registration_mode = metadata->>'unitRegistrationMode'
where unit_registration_mode is null
  and metadata->>'unitRegistrationMode' in ('vertical', 'horizontal');
