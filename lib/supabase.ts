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
});
