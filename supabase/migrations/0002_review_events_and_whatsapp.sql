-- ============================================================================
-- BOREAS NFC HUB — Migración 0002: registro completo de calificaciones
-- Ejecutar completo en el SQL Editor de Supabase (Project → SQL Editor).
-- Idempotente: usa "if not exists", se puede re-correr.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 — review_events: log completo de TODA calificación del review funnel
--
-- Hasta ahora solo quedaban registradas en `feedbacks` las de 1-3 estrellas
-- (las que pasan por el formulario privado). Las de 4-5 se redirigían directo
-- a la reseña pública sin dejar rastro, así que no había historial completo
-- ni forma de sacar métricas semanales reales.
--
-- Esta tabla guarda un evento por cada click de estrella (rating 1-5), SIN
-- comentario ni contacto: eso sigue viviendo en `feedbacks` para las bajas.
-- `feedbacks` = detalle privado de las negativas; `review_events` = historial
-- total para métricas.
-- ---------------------------------------------------------------------------
create table if not exists review_events (
  id uuid primary key default gen_random_uuid(),
  chip_id uuid not null references chips(id) on delete cascade,
  rating int2 not null check (rating between 1 and 5),
  source text not null default 'funnel',
  created_at timestamptz not null default now()
);

create index if not exists idx_review_events_chip_id on review_events (chip_id);
create index if not exists idx_review_events_created_at on review_events (created_at desc);

comment on table review_events is
  'Log completo de toda calificación de estrellas (1-5) del review funnel, sin comentario. feedbacks guarda el detalle privado de las negativas; esta tabla es el historial total para métricas.';

-- RLS activado sin policies públicas, igual que el resto de tablas: todo el
-- acceso pasa por el service_role key desde el servidor de Next.js.
alter table review_events enable row level security;

-- ---------------------------------------------------------------------------
-- 2.2 — El número que recibe las notificaciones de WhatsApp (alerta inmediata
-- de 1-2 estrellas + resumen semanal) es la columna ya existente
-- clients.owner_whatsapp. No se agrega columna nueva.
-- ---------------------------------------------------------------------------
comment on column clients.owner_whatsapp is
  'WhatsApp de contacto del comercio. Se usa para el menú interactivo (wa.me) y para las notificaciones automáticas vía WhatsApp Cloud API de Meta (alerta de reseña 1-2 estrellas y resumen semanal).';
