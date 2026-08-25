import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * ADVERTENCIA: este cliente usa el SERVICE_ROLE_KEY, que ignora todas las
 * políticas de RLS. NUNCA debe importarse desde un componente marcado
 * "use client" ni exponerse al navegador. Solo se usa dentro de:
 *   - Server Components (app/**\/page.tsx sin "use client")
 *   - Route Handlers (app/api/**\/route.ts)
 *
 * En este proyecto no hay login de clientes, así que no existe un cliente
 * "anon" separado: todo el acceso a datos pasa por el servidor.
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Faltan las variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY. Revisa tu .env.local"
  );
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  // CRÍTICO: Next.js App Router cachea fetch() indefinidamente por defecto
  // (Data Cache), incluso cuando el origen no manda Cache-Control y aunque
  // el route/page tenga `export const dynamic = "force-dynamic"` — esa
  // config solo cubre fetches que Next puede analizar estáticamente en ESE
  // segmento, no garantiza nada para un cliente HTTP de una librería externa
  // compartido como singleton entre rutas. Sin esto, un chip consultado una
  // vez mientras is_active=false queda "congelado" así para /r/[chip_code]
  // aunque se active después, hasta el próximo deploy/restart — reproducido
  // y confirmado en verificación manual antes de mergear.
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});
