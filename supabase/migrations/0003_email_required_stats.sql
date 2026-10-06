-- ============================================================================
-- BOREAS NFC HUB — Migración 0003: correo como contacto principal (WhatsApp
-- pasa a opcional) + estadísticas de reseñas por comercio y generales.
-- Ejecutar completo en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 — owner_whatsapp pasa a opcional.
--
-- Antes WhatsApp era el único contacto obligatorio al registrar un comercio.
-- Las notificaciones automáticas (alerta de reseña negativa, reporte
-- quincenal) hoy van por WhatsApp Cloud API (Meta exige plantillas
-- pre-aprobadas, más fricción de aprobación) y por correo (sin esa fricción).
-- De ahora en adelante el dato que se EXIGE al registrar un comercio nuevo es
-- owner_email; owner_whatsapp queda opcional.
--
-- owner_email NO se vuelve NOT NULL a nivel de base de datos a propósito: ya
-- existen comercios sin ese campo cargado (ver advertencia en
-- app/api/cron/biweekly-report) y un NOT NULL duro rompería esta migración
-- contra esos datos existentes. Se exige en la capa de aplicación
-- (app/api/clients, lib/resolveClient.ts) solo para comercios nuevos, sin
-- tocar los existentes.
-- ---------------------------------------------------------------------------
alter table clients alter column owner_whatsapp drop not null;

comment on column clients.owner_whatsapp is
  'WhatsApp de contacto del comercio. OPCIONAL desde esta migración — antes era obligatorio; el dato que ahora se exige al registrar un comercio nuevo es owner_email.';
comment on column clients.owner_email is
  'Correo de contacto del comercio. Obligatorio para comercios nuevos (se valida en app/api/clients y lib/resolveClient.ts); sigue siendo nullable a nivel de base por los comercios registrados antes de este cambio.';

-- ---------------------------------------------------------------------------
-- 3.2 — client_summary: + estadísticas de reseñas por comercio
-- (total_reviews / average_rating / negative_reviews, desde review_events).
-- ---------------------------------------------------------------------------
create or replace view client_summary as
select
  cl.id as client_id,
  cl.business_name,
  cl.billing_status,
  count(distinct c.id) filter (where c.is_active) as active_chips,
  count(distinct te.id) as total_taps,
  max(te.created_at) as last_tap_at,
  count(distinct re.id) as total_reviews,
  avg(re.rating) as average_rating,
  count(distinct re.id) filter (where re.rating <= 2) as negative_reviews
from clients cl
left join chips c on c.client_id = cl.id
left join tap_events te on te.chip_id = c.id
left join review_events re on re.chip_id = c.id
group by cl.id, cl.business_name, cl.billing_status;

-- ---------------------------------------------------------------------------
-- 3.3 — overview_stats: una sola fila con los números generales para la
-- portada de /admin (NFC vendidos/activos, sin activar, reseñas, promedio).
-- ---------------------------------------------------------------------------
create or replace view overview_stats as
select
  (select count(*) from chips) as total_chips,
  (select count(*) from chips where is_active) as active_chips,
  (select count(*) from chips where not is_active) as pending_chips,
  (select count(*) from clients) as total_clients,
  (select count(*) from review_events) as total_reviews,
  (select avg(rating) from review_events) as average_rating,
  (select count(*) from review_events where rating <= 2) as negative_reviews;
