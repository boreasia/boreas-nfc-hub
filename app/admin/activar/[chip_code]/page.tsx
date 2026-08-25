import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import InstallerExpress from "@/components/InstallerExpress";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { chip_code: string };
}

export default async function ActivarChipPage({ params }: PageProps) {
  const { data: chip } = await supabaseAdmin
    .from("chips")
    .select("*, clients(*)")
    .eq("chip_code", params.chip_code)
    .maybeSingle();

  if (!chip) notFound();

  return <InstallerExpress chipCode={chip.chip_code} chipId={chip.id} />;
}
