import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("*")
    .order("business_name", { ascending: true });

  if (error) {
    console.error("[clients][GET] error:", error.message);
    return NextResponse.json({ error: "No se pudieron cargar los comercios." }, { status: 500 });
  }

  return NextResponse.json({ clients: data });
}

interface CreateClientPayload {
  business_name: string;
  owner_whatsapp: string;
  owner_email?: string | null;
  logo_url?: string | null;
}

export async function POST(request: NextRequest) {
  let body: CreateClientPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.business_name?.trim() || !body.owner_whatsapp?.trim()) {
    return NextResponse.json(
      { error: "business_name y owner_whatsapp son obligatorios." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert({
      business_name: body.business_name.trim(),
      owner_whatsapp: body.owner_whatsapp.trim(),
      owner_email: body.owner_email ?? null,
      logo_url: body.logo_url ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[clients][POST] error:", error?.message);
    return NextResponse.json({ error: "No se pudo crear el comercio." }, { status: 500 });
  }

  return NextResponse.json({ client: data }, { status: 201 });
}
