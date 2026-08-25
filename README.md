# Boreas NFC Hub

Sistema de tarjetas/exhibidores NFC + QR dinámicos para comercios locales
(restaurantes, clínicas estéticas, hoteles, moteles), operado por un único
administrador (Boreas IA). Next.js 14 (App Router) + Tailwind + Supabase.

## 1. Setup

```bash
npm install
cp .env.example .env.local   # completa tus valores reales
```

En Supabase: abre el SQL Editor y corre todo el contenido de `schema.sql`.
Eso crea las 4 tablas, el enum `chip_mode`, los índices, RLS (sin policies
públicas — solo el `service_role` key puede leer/escribir) y la vista
`chip_metrics` que alimenta el dashboard de `/admin`.

```bash
npm run dev
```

## 2. El flujo real de venta en frío (esto es lo que resuelve tu cuello de botella del QR)

El problema que mencionaste — "no puedo programar el QR en el momento sin
enfriar la venta" — se resuelve así:

1. **Antes de salir a visitar comercios**, corres un lote:

   ```bash
   node scripts/generate-chips.mjs --count 50 --prefix BOREAS --domain https://tu-dominio.com
   ```

   Esto inserta 50 `chip_code` en Supabase (`is_active = false`, sin
   comercio asignado) y te deja 50 PNGs de QR ya listos en
   `qr-output/BOREAS-<timestamp>/`, cada uno apuntando a
   `https://tu-dominio.com/r/BOREAS-XXX`.

2. **Imprimes ese lote** (stickers, tarjetas, o lo que uses para las
   tarjetas/exhibidores físicos) y programas el NFC con la misma URL.
   Ya llevas el inventario contigo, sin depender de internet ni de volver
   a la oficina.

3. **En la visita**, cuando el cliente dice que sí, escaneas el QR/NFC de
   la tarjeta que llevas. Como el chip existe pero está inactivo, cae
   directo en el **Instalador Express**: llenas nombre del comercio,
   WhatsApp, modo (reseñas/IG/PDF/menú) y la URL de destino, le das
   "Vincular y activar chip", y en segundos esa misma tarjeta física ya
   está en producción. Cero fricción, cero "vuelvo mañana".

4. Puedes reactivar/reasignar cualquier chip después desde `/admin`
   buscando su código — útil si un comercio cierra y quieres reciclar la
   tarjeta física con otro cliente.

## 3. Estructura

```
app/
  r/[chip_code]/page.tsx     → router principal: registra el tap y decide qué mostrar
  admin/page.tsx             → Control Center (buscar/activar chips + métricas)
  api/feedback/route.ts      → guarda feedback negativo + dispara webhook Make
  api/clients/route.ts       → listar/crear comercios
  api/chips/activate/route.ts→ vincula comercio + activa chip
  api/chips/lookup/route.ts  → busca chip por código (usado en /admin)
  api/chips/metrics/route.ts → métricas agregadas por chip
components/
  ReviewFunnel.tsx           → estrellas → redirección o formulario privado
  InstallerExpress.tsx       → activación en sitio (mobile-first)
  InteractiveMenu.tsx        → carta con carrito → pedido por WhatsApp
lib/supabase.ts              → cliente admin (service_role, solo servidor)
scripts/generate-chips.mjs   → generador de lotes + QR para imprimir
schema.sql                   → esquema completo de Supabase
```

## 4. Notas de producción

- `/admin` está protegido con Basic Auth (`ADMIN_USER` / `ADMIN_PASSWORD`
  en `.env.local`). Si no los configuras, queda abierto — no lo dejes así
  en producción.
- El webhook de Make (`MAKE_WEBHOOK_URL`) recibe el feedback negativo con
  todo el contexto del comercio; desde ahí decides en Make si el mensaje
  va por WhatsApp, correo, o ambos, sin tocar este código.
- `InteractiveMenu.tsx` trae un menú de ejemplo (`PLACEHOLDER_MENU`) para
  que veas el patrón. Cuando quieras conectarlo a datos reales por
  comercio, la ruta natural es agregar tablas `menu_categories` /
  `menu_items` con `client_id` y reemplazar ese arreglo por una consulta.
- Todo el acceso a datos pasa por `service_role` en el servidor. Si más
  adelante quieres que cada comercio tenga su propio login (multi-tenant),
  ahí es donde agregas Supabase Auth + policies con `auth.uid()` — el
  esquema ya está listo para esa extensión sin romper nada.
