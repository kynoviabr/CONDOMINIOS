alter table public.resident_vehicles
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists vehicle_type text,
  add column if not exists brand text,
  add column if not exists model text,
  add column if not exists color text,
  add column if not exists notes text;

create index if not exists resident_vehicles_unit_id_idx on public.resident_vehicles(unit_id);

alter table public.resident_vehicles
  drop constraint if exists resident_vehicles_vehicle_type_check;

alter table public.resident_vehicles
  add constraint resident_vehicles_vehicle_type_check
  check (vehicle_type is null or vehicle_type in ('automobile', 'motorcycle', 'bicycle', 'van', 'truck'));
