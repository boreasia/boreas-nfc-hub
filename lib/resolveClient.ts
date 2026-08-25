import { supabaseAdmin } from "@/lib/supabase";

export type ClientRef =
  | { id: string }
  | { business_name: string; owner_whatsapp: string; logo_url?: string | null };

export type ResolveClientResult = { clientId: string; error?: undefined } | { clientId?: undefined; error: string };

// Compartido por /api/chips/activate y /api/chips/update: ambos reciben o
// bien el id de un comercio existente, o los datos para crear uno nuevo.
export async function resolveClientId(client: ClientRef): Promise<ResolveClientResult> {
  if ("id" in client) {
    return { clientId: client.id };
  }

  if (!client.business_name?.trim() || !client.owner_whatsapp?.trim()) {
    return { error: "business_name y owner_whatsapp son obligatorios para un comercio nuevo." };
  }

  const { data: newClient, error } = await supabaseAdmin
    .from("clients")
    .insert({
      business_name: client.business_name.trim(),
      owner_whatsapp: client.owner_whatsapp.trim(),
      logo_url: client.logo_url ?? null,
    })
    .select()
    .single();

  if (error || !newClient) {
    console.error("[resolveClientId] error creando cliente:", error?.message);
    return { error: "No se pudo crear el comercio." };
  }

  return { clientId: newClient.id };
}
