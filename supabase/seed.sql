insert into public.tenants (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Kynovia Demo', 'kynovia-demo')
on conflict (slug) do update
set name = excluded.name;

insert into public.condominiums (id, tenant_id, name, slug, timezone)
values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'Condominio Demo',
  'condominio-demo',
  'America/Sao_Paulo'
)
on conflict (tenant_id, slug) do update
set name = excluded.name,
    timezone = excluded.timezone;

insert into public.access_points (id, tenant_id, condominium_id, name, kind)
values (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'Portaria Principal',
  'gatehouse'
)
on conflict (tenant_id, condominium_id, name) do update
set kind = excluded.kind;

insert into public.units (id, tenant_id, condominium_id, block, number, floor)
values (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'A',
  '101',
  '1'
)
on conflict (condominium_id, block, number) do update
set floor = excluded.floor;

insert into public.residents (id, tenant_id, condominium_id, full_name, document, phone, email, status)
values (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'Morador Demo',
  '00000000000',
  '+5511999990000',
  'morador.demo@kynovia.local',
  'active'
)
on conflict (id) do update
set full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    status = excluded.status;

insert into public.resident_units (tenant_id, condominium_id, resident_id, unit_id, relationship, is_primary)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000301',
  'owner',
  true
)
on conflict (resident_id, unit_id) do update
set relationship = excluded.relationship,
    is_primary = excluded.is_primary;

insert into public.resident_vehicles (
  id,
  tenant_id,
  condominium_id,
  resident_id,
  unit_id,
  plate,
  label,
  status,
  vehicle_type
)
values (
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000301',
  'ABC1D23',
  'Carro principal',
  'active',
  'automobile'
)
on conflict (condominium_id, plate) do update
set resident_id = excluded.resident_id,
    unit_id = excluded.unit_id,
    label = excluded.label,
    status = excluded.status,
    vehicle_type = excluded.vehicle_type;

insert into public.visitors (id, tenant_id, condominium_id, full_name, document, phone, notes)
values (
  '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'Visitante Demo',
  '11111111111',
  '+5511988880000',
  'Registro de desenvolvimento'
)
on conflict (id) do update
set full_name = excluded.full_name,
    phone = excluded.phone,
    notes = excluded.notes;

insert into public.visitor_vehicles (tenant_id, condominium_id, visitor_id, plate)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000601',
  'XYZ9A87'
)
on conflict (visitor_id, plate) do nothing;

insert into public.access_invites (
  id,
  tenant_id,
  condominium_id,
  unit_id,
  resident_id,
  visitor_id,
  visitor_name,
  visitor_phone,
  plate,
  starts_at,
  expires_at,
  max_uses,
  status
)
values (
  '00000000-0000-0000-0000-000000000701',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000601',
  'Visitante Demo',
  '+5511988880000',
  'XYZ9A87',
  now(),
  now() + interval '1 day',
  1,
  'active'
)
on conflict (id) do update
set visitor_name = excluded.visitor_name,
    visitor_phone = excluded.visitor_phone,
    plate = excluded.plate,
    expires_at = excluded.expires_at,
    status = excluded.status;

insert into public.access_events (
  id,
  tenant_id,
  condominium_id,
  access_point_id,
  invite_id,
  visitor_id,
  plate,
  direction,
  decision,
  reason
)
values (
  '00000000-0000-0000-0000-000000000801',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000701',
  '00000000-0000-0000-0000-000000000601',
  'XYZ9A87',
  'entry',
  'allow',
  'Seed DEV'
)
on conflict (id) do nothing;

-- Phase 16 operational pilot DEV data.
-- All records below are fictitious and must not be used in production.

insert into public.condominiums (
  id,
  tenant_id,
  name,
  slug,
  timezone,
  visitor_parking_capacity,
  settings,
  operational_rules,
  metadata
)
values (
  '00000000-0000-0000-0000-000000010101',
  '00000000-0000-0000-0000-000000000001',
  'Residencial Piloto Aurora',
  'residencial-piloto-aurora',
  'America/Sao_Paulo',
  8,
  '{"pilot":true,"environment":"dev"}'::jsonb,
  '{"manualReviewRequiredForDeniedAccess":true,"hardwareMode":"mock"}'::jsonb,
  '{"phase":"16-operational-pilot"}'::jsonb
)
on conflict (tenant_id, slug) do update
set name = excluded.name,
    timezone = excluded.timezone,
    visitor_parking_capacity = excluded.visitor_parking_capacity,
    settings = excluded.settings,
    operational_rules = excluded.operational_rules,
    metadata = excluded.metadata;

insert into public.access_points (id, tenant_id, condominium_id, name, kind)
values
  (
    '00000000-0000-0000-0000-000000010201',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'Portaria Piloto',
    'gatehouse'
  ),
  (
    '00000000-0000-0000-0000-000000010202',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'Cancela Veiculos',
    'vehicle_gate'
  ),
  (
    '00000000-0000-0000-0000-000000010203',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'Portao Pedestres',
    'pedestrian_gate'
  ),
  (
    '00000000-0000-0000-0000-000000010204',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'Acesso Servico',
    'service_gate'
  )
on conflict (tenant_id, condominium_id, name) do update
set kind = excluded.kind;

insert into public.units (id, tenant_id, condominium_id, block, number, floor)
values
  (
    '00000000-0000-0000-0000-000000010301',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'A',
    '101',
    '1'
  ),
  (
    '00000000-0000-0000-0000-000000010302',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'A',
    '102',
    '1'
  ),
  (
    '00000000-0000-0000-0000-000000010303',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'B',
    '201',
    '2'
  )
on conflict (condominium_id, block, number) do update
set floor = excluded.floor;

insert into public.residents (id, tenant_id, condominium_id, full_name, document, phone, email, status, metadata)
values
  (
    '00000000-0000-0000-0000-000000010401',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'Moradora Piloto Ativa',
    '10000000001',
    '+5511911110001',
    'moradora.ativa@kynovia.local',
    'active',
    '{"pilotScenario":"resident_vehicle_entry"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000010402',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'Morador Convite QR',
    '10000000002',
    '+5511911110002',
    'morador.qr@kynovia.local',
    'active',
    '{"pilotScenario":"visitor_qr_invite"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000010403',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'Morador Convite Placa',
    '10000000003',
    '+5511911110003',
    'morador.placa@kynovia.local',
    'active',
    '{"pilotScenario":"visitor_plate_invite"}'::jsonb
  )
on conflict (id) do update
set full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    status = excluded.status,
    metadata = excluded.metadata;

insert into public.resident_units (tenant_id, condominium_id, resident_id, unit_id, relationship, is_primary)
values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010401',
    '00000000-0000-0000-0000-000000010301',
    'owner',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010402',
    '00000000-0000-0000-0000-000000010302',
    'resident',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010403',
    '00000000-0000-0000-0000-000000010303',
    'tenant',
    true
  )
on conflict (resident_id, unit_id) do update
set relationship = excluded.relationship,
    is_primary = excluded.is_primary;

insert into public.resident_vehicles (
  id,
  tenant_id,
  condominium_id,
  resident_id,
  unit_id,
  plate,
  label,
  status,
  vehicle_type
)
values (
  '00000000-0000-0000-0000-000000010501',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000010101',
  '00000000-0000-0000-0000-000000010401',
  '00000000-0000-0000-0000-000000010301',
  'PIL1A01',
  'Veiculo principal piloto',
  'active',
  'automobile'
)
on conflict (condominium_id, plate) do update
set resident_id = excluded.resident_id,
    unit_id = excluded.unit_id,
    label = excluded.label,
    status = excluded.status,
    vehicle_type = excluded.vehicle_type;

insert into public.visitors (id, tenant_id, condominium_id, full_name, document, phone, notes)
values
  (
    '00000000-0000-0000-0000-000000010601',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'Visitante QR Piloto',
    '20000000001',
    '+5511922220001',
    'Visitante ficticio para teste de QR'
  ),
  (
    '00000000-0000-0000-0000-000000010602',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'Visitante Placa Piloto',
    '20000000002',
    '+5511922220002',
    'Visitante ficticio para teste por placa'
  ),
  (
    '00000000-0000-0000-0000-000000010603',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    'Visitante Bloqueado Piloto',
    '20000000003',
    '+5511922220003',
    'Visitante ficticio para teste de negacao'
  )
on conflict (id) do update
set full_name = excluded.full_name,
    phone = excluded.phone,
    notes = excluded.notes;

insert into public.visitor_vehicles (tenant_id, condominium_id, visitor_id, plate)
values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010602',
    'PIL2B02'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010603',
    'BLK3C03'
  )
on conflict (visitor_id, plate) do nothing;

insert into public.access_invites (
  id,
  tenant_id,
  condominium_id,
  unit_id,
  resident_id,
  visitor_id,
  visitor_name,
  visitor_phone,
  plate,
  starts_at,
  expires_at,
  max_uses,
  status,
  invite_type,
  qr_token_hash,
  qr_token_expires_at,
  metadata
)
values
  (
    '00000000-0000-0000-0000-000000010701',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010302',
    '00000000-0000-0000-0000-000000010402',
    '00000000-0000-0000-0000-000000010601',
    'Visitante QR Piloto',
    '+5511922220001',
    null,
    now() - interval '1 hour',
    now() + interval '1 day',
    1,
    'active',
    'single',
    'dev-pilot-qr-token-hash',
    now() + interval '1 day',
    '{"pilotScenario":"visitor_qr"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000010702',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010303',
    '00000000-0000-0000-0000-000000010403',
    '00000000-0000-0000-0000-000000010602',
    'Visitante Placa Piloto',
    '+5511922220002',
    'PIL2B02',
    now() - interval '1 hour',
    now() + interval '1 day',
    2,
    'active',
    'single',
    null,
    null,
    '{"pilotScenario":"visitor_plate"}'::jsonb
  )
on conflict (id) do update
set visitor_name = excluded.visitor_name,
    visitor_phone = excluded.visitor_phone,
    plate = excluded.plate,
    starts_at = excluded.starts_at,
    expires_at = excluded.expires_at,
    max_uses = excluded.max_uses,
    status = excluded.status,
    invite_type = excluded.invite_type,
    qr_token_hash = excluded.qr_token_hash,
    qr_token_expires_at = excluded.qr_token_expires_at,
    metadata = excluded.metadata;

insert into public.access_invite_validations (
  id,
  tenant_id,
  condominium_id,
  invite_id,
  result,
  reason
)
values (
  '00000000-0000-0000-0000-000000010751',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000010101',
  '00000000-0000-0000-0000-000000010701',
  'allowed',
  'Seed piloto QR'
)
on conflict (id) do nothing;

insert into public.vehicle_plate_blacklist (id, tenant_id, condominium_id, plate, reason, status)
values (
  '00000000-0000-0000-0000-000000010761',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000010101',
  'BLK3C03',
  'Bloqueio operacional ficticio para teste de negacao',
  'active'
)
on conflict (condominium_id, plate) do update
set reason = excluded.reason,
    status = excluded.status;

insert into public.access_events (
  id,
  tenant_id,
  condominium_id,
  access_point_id,
  invite_id,
  resident_id,
  visitor_id,
  plate,
  direction,
  decision,
  reason,
  metadata
)
values
  (
    '00000000-0000-0000-0000-000000010801',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010202',
    null,
    '00000000-0000-0000-0000-000000010401',
    null,
    'PIL1A01',
    'entry',
    'allow',
    'Piloto: entrada de morador ativo',
    '{"pilotScenario":"resident_entry"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000010802',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010202',
    '00000000-0000-0000-0000-000000010702',
    null,
    '00000000-0000-0000-0000-000000010602',
    'PIL2B02',
    'entry',
    'allow',
    'Piloto: visitante por placa autorizada',
    '{"pilotScenario":"visitor_plate"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000010803',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000010101',
    '00000000-0000-0000-0000-000000010202',
    null,
    null,
    '00000000-0000-0000-0000-000000010603',
    'BLK3C03',
    'entry',
    'deny',
    'Piloto: placa bloqueada',
    '{"pilotScenario":"denial"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.visitor_vehicle_accesses (
  id,
  tenant_id,
  condominium_id,
  invite_id,
  unit_id,
  plate,
  visitor_name,
  status,
  entered_at,
  notes
)
values (
  '00000000-0000-0000-0000-000000010851',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000010101',
  '00000000-0000-0000-0000-000000010702',
  '00000000-0000-0000-0000-000000010303',
  'PIL2B02',
  'Visitante Placa Piloto',
  'active',
  now() - interval '15 minutes',
  'Permanencia ativa ficticia para teste de painel'
)
on conflict (id) do update
set status = excluded.status,
    notes = excluded.notes;

insert into public.gatehouse_occurrences (
  id,
  tenant_id,
  condominium_id,
  title,
  description,
  severity,
  status
)
values (
  '00000000-0000-0000-0000-000000010901',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000010101',
  'Piloto - tentativa com placa bloqueada',
  'Ocorrencia ficticia para validar registro e revisao operacional.',
  'high',
  'open'
)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    severity = excluded.severity,
    status = excluded.status;

insert into public.operational_ai_analyses (
  id,
  tenant_id,
  condominium_id,
  provider,
  event_source,
  event_id,
  category,
  risk_level,
  risk_score,
  confidence,
  summary,
  recommendations,
  signals,
  metadata
)
values (
  '00000000-0000-0000-0000-000000011001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000010101',
  'mock_ai',
  'access_event',
  '00000000-0000-0000-0000-000000010803',
  'possible_fraud',
  'high',
  78,
  0.910,
  'Tentativa negada por placa bloqueada durante piloto DEV.',
  '[{"action":"manual_review","label":"Revisar placa bloqueada antes de qualquer liberacao","priority":"high"}]'::jsonb,
  '[{"name":"denied_attempts_24h","value":1},{"name":"blacklist_hit","value":true}]'::jsonb,
  '{"pilotScenario":"operational_ai"}'::jsonb
)
on conflict (id) do update
set risk_level = excluded.risk_level,
    risk_score = excluded.risk_score,
    summary = excluded.summary,
    recommendations = excluded.recommendations,
    signals = excluded.signals,
    metadata = excluded.metadata;

insert into public.operational_ai_alerts (
  id,
  tenant_id,
  condominium_id,
  analysis_id,
  alert_type,
  severity,
  title,
  description,
  status,
  metadata
)
values (
  '00000000-0000-0000-0000-000000011101',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000010101',
  '00000000-0000-0000-0000-000000011001',
  'possible_fraud',
  'high',
  'Piloto - revisar tentativa negada',
  'Alerta ficticio para validar fluxo de IA operacional sem automacao.',
  'open',
  '{"pilotScenario":"operational_ai_alert"}'::jsonb
)
on conflict (id) do update
set severity = excluded.severity,
    title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    metadata = excluded.metadata;

insert into public.gate_commands (
  id,
  tenant_id,
  condominium_id,
  access_point_id,
  access_event_id,
  command,
  provider,
  status
)
values (
  '00000000-0000-0000-0000-000000000901',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000801',
  'open',
  'mock',
  'confirmed'
)
on conflict (id) do update
set status = excluded.status;

insert into public.suppliers (
  id,
  tenant_id,
  condominium_id,
  name,
  trade_name,
  document,
  category,
  contact_name,
  phone,
  email,
  status,
  allowed_weekdays,
  allowed_time_start,
  allowed_time_end,
  metadata
)
values
  (
    '00000000-0000-0000-0000-000000000951',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'Atlas Schindler Elevadores Ltda',
    'Atlas Schindler',
    '00.000.000/0001-91',
    'maintenance',
    'Carlos Manutenção',
    '+5511999998888',
    'suporte@atlas.exemplo.com',
    'active',
    '{1,2,3,4,5,6,7}',
    '00:00',
    '23:59',
    '{"contractNumber":"CT-2026-01"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000952',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'Verde & Vida Jardinagem ME',
    'Verde & Vida',
    '11.222.333/0001-44',
    'gardening',
    'Roberto Jardineiro',
    '+5511988887777',
    'contato@verdevida.exemplo.com',
    'active',
    '{2,4,6}',
    '08:00',
    '17:00',
    '{"notes":"Entrada autorizada ter/qui/sex"}'::jsonb
  )
on conflict (id) do update
set name = excluded.name,
    trade_name = excluded.trade_name,
    document = excluded.document,
    category = excluded.category,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    email = excluded.email,
    status = excluded.status,
    allowed_weekdays = excluded.allowed_weekdays,
    allowed_time_start = excluded.allowed_time_start,
    allowed_time_end = excluded.allowed_time_end,
    metadata = excluded.metadata;

insert into public.employees (
  id,
  tenant_id,
  condominium_id,
  full_name,
  document,
  role_title,
  department,
  phone,
  email,
  shift_start,
  shift_end,
  workdays,
  status,
  emergency_contact_name,
  emergency_contact_phone,
  hire_date,
  metadata
)
values
  (
    '00000000-0000-0000-0000-000000000961',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'Antônio Carlos Ferreira',
    '123.456.789-00',
    'Zelador Geral',
    'maintenance',
    '+5511977776666',
    'antonio.zeladoria@condominio.exemplo.com',
    '08:00',
    '17:00',
    '{2,3,4,5,6}',
    'active',
    'Maria Ferreira (Esposa)',
    '+5511977770000',
    '2024-02-01',
    '{"badgeNumber":"ZEL-01","uniformSize":"G"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000962',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'Luciana Silveira',
    '987.654.321-11',
    'Supervisora de Portaria',
    'gatehouse',
    '+5511966665555',
    'luciana.portaria@condominio.exemplo.com',
    '07:00',
    '19:00',
    '{2,4,6}',
    'active',
    'Paulo Silveira (Irmão)',
    '+5511966660000',
    '2024-05-15',
    '{"badgeNumber":"POR-02","shiftType":"12x36"}'::jsonb
  )
on conflict (id) do update
set full_name = excluded.full_name,
    document = excluded.document,
    role_title = excluded.role_title,
    department = excluded.department,
    phone = excluded.phone,
    email = excluded.email,
    shift_start = excluded.shift_start,
    shift_end = excluded.shift_end,
    workdays = excluded.workdays,
    status = excluded.status,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone,
    hire_date = excluded.hire_date,
    metadata = excluded.metadata;

insert into public.audit_logs (
  id,
  tenant_id,
  condominium_id,
  action,
  entity_table,
  entity_id,
  metadata
)
values (
  '00000000-0000-0000-0000-000000001001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'seed.created',
  'seed',
  null,
  '{"environment":"development"}'::jsonb
)
on conflict (id) do nothing;

