-- Backfill only associations that can be derived without guessing business data.
with preferred_units as (
  select distinct on (resident_unit.resident_id, resident_unit.condominium_id)
    resident_unit.resident_id,
    resident_unit.condominium_id,
    resident_unit.tenant_id,
    resident_unit.unit_id
  from public.resident_units resident_unit
  order by
    resident_unit.resident_id,
    resident_unit.condominium_id,
    resident_unit.is_primary desc,
    resident_unit.created_at asc
)
update public.resident_vehicles vehicle
set unit_id = preferred_unit.unit_id
from preferred_units preferred_unit
where vehicle.unit_id is null
  and preferred_unit.resident_id = vehicle.resident_id
  and preferred_unit.condominium_id = vehicle.condominium_id
  and preferred_unit.tenant_id = vehicle.tenant_id;

alter table public.resident_vehicles
  drop constraint if exists resident_vehicles_required_fields_check,
  drop constraint if exists resident_vehicles_normalized_plate_check;

alter table public.resident_vehicles
  add constraint resident_vehicles_required_fields_check
    check (unit_id is not null and vehicle_type is not null) not valid,
  add constraint resident_vehicles_normalized_plate_check
    check (plate ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$') not valid;

create or replace function public.validate_resident_vehicle_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.unit_id is null then
    raise exception 'resident vehicle unit is required' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.residents resident
    join public.resident_units resident_unit
      on resident_unit.resident_id = resident.id
     and resident_unit.unit_id = new.unit_id
     and resident_unit.tenant_id = new.tenant_id
     and resident_unit.condominium_id = new.condominium_id
    join public.units unit
      on unit.id = resident_unit.unit_id
     and unit.tenant_id = new.tenant_id
     and unit.condominium_id = new.condominium_id
    where resident.id = new.resident_id
      and resident.tenant_id = new.tenant_id
      and resident.condominium_id = new.condominium_id
  ) then
    raise exception 'resident vehicle associations must share tenant and condominium scope'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_resident_vehicle_scope() from public, anon, authenticated;

drop trigger if exists resident_vehicles_validate_scope on public.resident_vehicles;
create trigger resident_vehicles_validate_scope
before insert or update of tenant_id, condominium_id, resident_id, unit_id
on public.resident_vehicles
for each row execute function public.validate_resident_vehicle_scope();
