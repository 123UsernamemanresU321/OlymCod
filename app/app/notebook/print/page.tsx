import { NotebookPrintRouteClient } from "@/components/notebook/print/NotebookPrintRouteClient";
import { requireOwner } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function NotebookPrintPage() {
  await requireOwner();

  return <NotebookPrintRouteClient />;
}
