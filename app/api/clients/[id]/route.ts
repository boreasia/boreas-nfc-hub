import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { BillingStatus } from "@/types/database";

const VALID_BILLING_STATUS: BillingStatus[] = ["al_dia", "pendiente", "atrasado"];

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Comercio no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ client: data });
}

interface UpdateClientPayload {
  business_name?: string;
  owner_whatsapp?: string;
  owner_email?: string | null;
  logo_url?: string | null;
  billing_status?: BillingStatus;
  monthly_fee?: number | null;
  next_billing_date?: string | null;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  let body: UpdateClientPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (body.business_name !== undefined && !body.business_name.trim()) {
    return NextResponse.json({ error: "business_name no puede quedar vacío." }, { status: 400 });
  }
  if (body.owner_whatsapp !== undefined && !body.owner_whatsapp.trim()) {
    return NextResponse.json({ error: "owner_whatsapp no puede quedar vacío." }, { status: 400 });
  }
  if (body.billing_status !== undefined && !VALID_BILLING_STATUS.includes(body.billing_status)) {
    return NextResponse.json({ error: "billing_status inválido." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("clients")
    .update({
      ...(body.business_name !== undefined && { business_name: body.business_name.trim() }),
      ...(body.owner_whatsapp !== undefined && { owner_whatsapp: body.owner_whatsapp.trim() }),
      ...(body.owner_email !== undefined && { owner_email: body.owner_email }),
      ...(body.logo_url !== undefined && { logo_url: body.logo_url }),
      ...(body.billing_status !== undefined && { billing_status: body.billing_status }),
      ...(body.monthly_fee !== undefined && { monthly_fee: body.monthly_fee }),
      ...(body.next_billing_date !== undefined && { next_billing_date: body.next_billing_date }),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data) {
    console.error("[clients/[id]][PATCH] error:", error?.message);
    return NextResponse.json({ error: "No se pudo actualizar el comercio." }, { status: 500 });
  }

  return NextResponse.json({ client: data });
}
