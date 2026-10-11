-- ============================================================================
-- BOREAS NFC HUB — Migración 0004: registrar CADA calificación (1-5), no
-- solo las negativas, + total de usos (taps) en la portada de /admin.
--
-- Contexto: la migración 0003 dejó total_reviews/average_rating/
-- negative_reviews (client_summary, overview_stats) agregando desde
-- `feedbacks`, que SOLO guarda reseñas de 1-3 estrellas (las de 4-5 van
-- directo a Google sin quedar registradas en ningún lado). Esta migración
-- agrega una tabla nueva que registra TODA calificación del review funnel, y
-- reapunta esas tres columnas a ella. `feedbacks` sigue existiendo igual que
-- antes, sin ningún cambio: sigue siendo el detalle privado (comentario +
-- contacto) de las negativas, y sigue disparando las alertas de
-- WhatsApp/correo — eso no se toca.
--
-- IMPORTANTE (lección de la migración 0003, que asumió que review_events
-- existía sin confirmarlo y rompió producción): el código de la app que
-- depende de `rating_events` NO se escribe ni se despliega hasta confirmar
-- en vivo, con el service-role key, que esta tabla ya existe en producción.
-- Avisa cuando la corras.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4.1 — rating_events: un evento por cada click de estrella (1-5) del review
-- funnel, sin comentario ni contacto (eso sigue en `feedbacks`).
-- ---------------------------------------------------------------------------
create table if not exists rating_events (
  id uuid primary key default gen_random_uuid(),
  chip_id uuid not null references chips(id) on delete cascade,
  rating int2 not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists idx_rating_events_chip_id on rating_events (chip_id);
create index if not exists idx_rating_events_created_at on rating_events (created_at desc);

alter table rating_events enable row level security;

comment on table rating_events is
  'Un evento por cada calificación (1-5 estrellas) dada en el review funnel, sin comentario ni contacto. feedbacks sigue siendo el detalle privado de las negativas (comentario, contacto, alertas); esta tabla es el historial completo para estadísticas.';

-- ---------------------------------------------------------------------------
-- 4.2 — client_summary: total_reviews/average_rating/negative_reviews ahora
-- desde rating_events (todo el 1-5), no desde feedbacks (solo 1-3). Mismo
-- patrón de subconsultas separadas por client_id que la migración 0003, para
-- evitar el fan-out de joinear varias tablas one-to-many a la vez (eso
-- infla total_taps y distorsiona average_rating si se hace en un solo join).
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
  coalesce(r.total_reviews, 0) as total_reviews,
  r.average_rating,
  coalesce(r.negative_reviews, 0) as negative_reviews
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
         count(re.id) as total_reviews,
         avg(re.rating) as average_rating,
         count(*) filter (where re.rating <= 2) as negative_reviews
  from chips c
  join rating_events re on re.chip_id = c.id
  group by c.client_id
) r on r.client_id = cl.id;

-- ---------------------------------------------------------------------------
-- 4.3 — overview_stats: mismo cambio de fuente (rating_events en vez de
-- feedbacks) + total_taps: cada uso físico del NFC, tenga o no calificación
-- (lo más literal de "cada uso de NFC" — ya existía en tap_events, solo no
-- estaba sumado acá).
-- ---------------------------------------------------------------------------
create or replace view overview_stats
with (security_invoker = true) as
select
  (select count(*) from chips) as total_chips,
  (select count(*) from chips where is_active) as active_chips,
  (select count(*) from chips where not is_active) as pending_chips,
  (select count(*) from clients) as total_clients,
  (select count(*) from tap_events) as total_taps,
  (select count(*) from rating_events) as total_reviews,
  (select avg(rating) from rating_events) as average_rating,
  (select count(*) from rating_events where rating <= 2) as negative_reviews;
