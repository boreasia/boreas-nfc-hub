import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import ClientEditForm from "@/components/ClientEditForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar comercio · Boreas NFC Hub",
};

interface PageProps {
  params: { client_id: string };
}

export default async function EditarComercioPage({ params }: PageProps) {
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("id", params.client_id)
    .maybeSingle();

  if (!client) notFound();

  return <ClientEditForm client={client} />;
}
