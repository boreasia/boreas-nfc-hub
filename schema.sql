-- ============================================================================
-- BOREAS NFC HUB — Esquema de base de datos (Supabase / Postgres)
-- Modelo: administrador único (Boreas IA). No hay login de clientes.
-- Todo el acceso pasa por el service_role key desde el servidor de Next.js;
-- por eso RLS queda activado pero SIN policies para anon/authenticated:
-- eso bloquea cualquier lectura/escritura directa desde el navegador.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM: modo de operación de cada chip
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'chip_mode') then
    create type chip_mode as enum (
      'review_funnel',
      'instagram',
      'pdf_menu',
      'interactive_menu'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- TABLE: clients (comercios)
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_whatsapp text not null,
  owner_email text,
  logo_url text,
  created_at timestamptz not null default now(),
  -- Facturación (migración 0001_billing_and_summary.sql)
  monthly_fee numeric(10,2),
  billing_status text default 'al_dia'
    check (billing_status in ('al_dia', 'pendiente', 'atrasado')),
  next_billing_date date,
  client_since date default current_date
);

comment on table clients is 'Comercios (restaurantes, clínicas, hoteles, moteles) vinculados a uno o más chips.';

-- ---------------------------------------------------------------------------
-- TABLE: chips (tarjetas/exhibidores NFC y QR)
-- ---------------------------------------------------------------------------
create table if not exists chips (
  id uuid primary key default gen_random_uuid(),
  chip_code text not null unique,
  client_id uuid references clients(id) on delete set null,
  mode chip_mode not null default 'review_funnel',
  destination_url text,
  is_active boolean not null default false,
  menu_pdf_url text,
  created_at timestamptz not null default now(),
  activated_at timestamptz
);

create index if not exists idx_chips_chip_code on chips (chip_code);
create index if not exists idx_chips_client_id on chips (client_id);

comment on table chips is 'Inventario de tarjetas/soportes NFC+QR. Se pre-generan en lote (is_active=false) y se activan en sitio durante la visita comercial.';

-- ---------------------------------------------------------------------------
-- TABLE: tap_events (métricas de escaneo/tap)
-- ---------------------------------------------------------------------------
create table if not exists tap_events (
  id uuid primary key default gen_random_uuid(),
  chip_id uuid not null references chips(id) on delete cascade,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tap_events_chip_id on tap_events (chip_id);
create index if not exists idx_tap_events_created_at on tap_events (created_at desc);

comment on table tap_events is 'Cada vez que alguien escanea/toca un chip, sin importar si está activo.';

-- ---------------------------------------------------------------------------
-- TABLE: feedbacks (comentarios < 4 estrellas)
-- ---------------------------------------------------------------------------
create table if not exists feedbacks (
  id uuid primary key default gen_random_uuid(),
  chip_id uuid not null references chips(id) on delete cascade,
  rating int2 not null check (rating between 1 and 5),
  comment text,
  customer_contact text,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedbacks_chip_id on feedbacks (chip_id);

comment on table feedbacks is 'Feedback privado capturado cuando la calificación es baja (1-3 estrellas), antes de exponer al cliente al review público.';

-- ---------------------------------------------------------------------------
-- RLS: activado en todas las tablas, sin policies públicas.
-- El service_role key de Supabase ignora RLS por diseño, así que el backend
-- de Next.js (Server Components / Route Handlers) sigue funcionando normal.
-- Si en el futuro agregas logins de cliente, aquí es donde se suman policies
-- con auth.uid() = clients.owner_id, etc.
-- ---------------------------------------------------------------------------
alter table clients enable row level security;
alter table chips enable row level security;
alter table tap_events enable row level security;
alter table feedbacks enable row level security;

-- ---------------------------------------------------------------------------
-- Vista de conveniencia: resumen de métricas por chip (útil para /admin)
--
-- days_since_last_tap: días desde el último tap_event del chip. Si nunca tuvo
-- taps pero está activo, cuenta desde activated_at (para que un chip activo
-- que jamás recibió un tap también se marque como "sin actividad" en vez de
-- quedar en null para siempre). Si no está activo y nunca tuvo taps, null.
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

-- ---------------------------------------------------------------------------
-- Vista: actividad agregada por cliente (útil para /admin agrupado)
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
