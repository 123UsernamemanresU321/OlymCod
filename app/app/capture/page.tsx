import { CaptureClient } from "@/components/capture/CaptureClient";
import { requireOwner } from "@/lib/auth/server";
import type { QuickCapture } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CapturePage({
  searchParams
}: {
  searchParams?: Promise<{ convert?: string }>;
}) {
  const { supabase } = await requireOwner();
  const params = searchParams ? await searchParams : {};
  const { data } = await supabase
    .from("quick_captures")
    .select("*")
    .order("created_at", { ascending: false });

  return <CaptureClient captures={(data ?? []) as QuickCapture[]} initialConvertId={params.convert ?? null} />;
}
