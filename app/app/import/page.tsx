import { SmartImporterClient } from "@/components/importer/SmartImporterClient";
import { requireOwner } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireOwner();
  return <SmartImporterClient />;
}
