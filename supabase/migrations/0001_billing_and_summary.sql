-- ============================================================================
-- BOREAS NFC HUB — Migración 0001: facturación por cliente + vistas de resumen
-- Ejecutar completo en el SQL Editor de Supabase (Project → SQL Editor).
-- Idempotente: usa "if not exists" / "create or replace", se puede re-correr.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1.1 — Campos de facturación en clients
-- ---------------------------------------------------------------------------
alter table clients add column if not exists
  monthly_fee numeric(10,2);
alter table clients add column if not exists
  billing_status text default 'al_dia'
  check (billing_status in ('al_dia', 'pendiente', 'atrasado'));
alter table clients add column if not exists
  next_billing_date date;
alter table clients add column if not exists
  client_since date default current_date;

-- ---------------------------------------------------------------------------
-- 1.2 — Vista de actividad por cliente
-- ---------------------------------------------------------------------------
create or replace view client_summary as
select
  cl.id as client_id,
  cl.business_name,
  cl.billing_status,
  count(distinct c.id) filter (where c.is_active) as active_chips,
  count(distinct te.id) as total_taps,
  max(te.created_at) as last_tap_at
from clients cl
left join chips c on c.client_id = cl.id
left join tap_events te on te.chip_id = c.id
group by cl.id, cl.business_name, cl.billing_status;

-- ---------------------------------------------------------------------------
-- 1.3 — chip_metrics: + client_id, + days_since_last_tap
--
-- days_since_last_tap: días desde el último tap_event del chip. Si nunca tuvo
-- taps pero está activo, cuenta desde activated_at (así un chip activo que
-- jamás recibió un tap también se marca como "sin actividad" en vez de
-- quedar en null para siempre, que dejaría sin alerta justo el caso más
-- grave). Si no está activo y nunca tuvo taps, queda null (inventario sin
-- instalar, no aplica alerta).
-- ---------------------------------------------------------------------------
create or replace view chip_metrics as
select
  c.id as chip_id,
  c.chip_code,
  c.client_id,
  c.mode,
  c.is_active,
  cl.business_name,
  count(distinct te.id) as total_taps,
  count(distinct fb.id) as total_feedbacks,
  count(distinct fb.id) filter (where fb.rating <= 3) as negative_feedbacks,
  extract(day from now() - coalesce(max(te.created_at), case when c.is_active then c.activated_at end))::int
    as days_since_last_tap
from chips c
left join clients cl on cl.id = c.client_id
left join tap_events te on te.chip_id = c.id
left join feedbacks fb on fb.chip_id = c.id
group by c.id, c.chip_code, c.client_id, c.mode, c.is_active, cl.business_name, c.activated_at;
