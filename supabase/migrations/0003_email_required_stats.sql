-- ============================================================================
-- BOREAS NFC HUB — Migración 0003: correo como contacto principal (WhatsApp
-- pasa a opcional) + estadísticas de reseñas por comercio y generales.
--
-- YA APLICADA en producción (este archivo quedó sincronizado con el SQL real
-- que se corrió en el SQL Editor de Supabase). OJO: a diferencia de la
-- versión anterior de este archivo, las estadísticas de reseñas se calculan
-- desde `feedbacks`, NO desde `review_events` — esa tabla nunca existió en
-- producción (el intento original de crearla, migración
-- 0002_review_events_and_whatsapp.sql, nunca se corrió). Como `feedbacks`
-- solo guarda las reseñas de 1-3 estrellas (las de 4-5 van directo a Google
-- y no quedan registradas en ningún lado), total_reviews/average_rating/
-- negative_reviews reflejan SOLO esas, no el 1-5 completo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 — owner_whatsapp pasa a opcional.
-- ---------------------------------------------------------------------------
alter table clients alter column owner_whatsapp drop not null;

comment on column clients.owner_whatsapp is
  'WhatsApp de contacto del comercio. OPCIONAL: el dato que se exige al registrar un comercio nuevo es owner_email.';
comment on column clients.owner_email is
  'Correo de contacto del comercio. Obligatorio para comercios nuevos (se valida en la app); nullable en base por los comercios anteriores.';

-- ---------------------------------------------------------------------------
-- 3.2 — client_summary con estadísticas de reseñas (desde feedbacks).
--
-- Cada bloque (chips activos, taps, feedbacks) se agrega en su propia
-- subconsulta ANTES de unirse a clients, agrupado por client_id — si se
-- unieran chips+tap_events+feedbacks directamente en un solo join, cada fila
-- de feedbacks se multiplicaría por cada fila de tap_events del mismo chip
-- (y viceversa), inflando total_taps y distorsionando average_rating. Las
-- subconsultas separadas evitan ese fan-out.
--
-- security_invoker = true: sin esto, una vista corre con los permisos de su
-- dueño (típicamente postgres) sin importar las RLS policies de quien la
-- consulta. Con esto, si alguna vez se expone esta vista a un rol distinto
-- del service_role (que de todos modos ignora RLS), sigue respetando RLS en
-- vez de ignorarlo por ser vista.
-- ---------------------------------------------------------------------------
create or replace view client_summary
with (security_invoker = true) as
select
  cl.id as client_id,
  cl.business_name,
  cl.billing_status,
  coalesce(ch.active_chips, 0) as active_chips,
  coalesce(t.total_taps, 0) as total_taps,
  t.last_tap_at,
  coalesce(f.total_reviews, 0) as total_reviews,
  f.average_rating,
  coalesce(f.negative_reviews, 0) as negative_reviews
from clients cl
left join (
  select client_id, count(*) filter (where is_active) as active_chips
  from chips
  group by client_id
) ch on ch.client_id = cl.id
left join (
  select c.client_id, count(te.id) as total_taps, max(te.created_at) as last_tap_at
  from chips c
  join tap_events te on te.chip_id = c.id
  group by c.client_id
) t on t.client_id = cl.id
left join (
  select c.client_id,
         count(fb.id) as total_reviews,
         avg(fb.rating) as average_rating,
         count(*) filter (where fb.rating <= 2) as negative_reviews
  from chips c
  join feedbacks fb on fb.chip_id = c.id
  group by c.client_id
) f on f.client_id = cl.id;

-- ---------------------------------------------------------------------------
-- 3.3 — overview_stats para la portada de /admin (desde feedbacks).
-- ---------------------------------------------------------------------------
create or replace view overview_stats
with (security_invoker = true) as
select
  (select count(*) from chips) as total_chips,
  (select count(*) from chips where is_active) as active_chips,
  (select count(*) from chips where not is_active) as pending_chips,
  (select count(*) from clients) as total_clients,
  (select count(*) from feedbacks) as total_reviews,
  (select avg(rating) from feedbacks) as average_rating,
  (select count(*) from feedbacks where rating <= 2) as negative_reviews;
