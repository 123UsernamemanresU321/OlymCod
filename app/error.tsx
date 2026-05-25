"use client";

import { Button } from "@/components/ui/Button";
import { PageShell, StatusMessage } from "@/components/ui/Page";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell size="md" className="min-h-screen">
      <StatusMessage tone="error">
        <p className="font-semibold">This page could not be loaded.</p>
        <p className="mt-1">{error.message || "Refresh the page or try again."}</p>
      </StatusMessage>
      <Button type="button" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </PageShell>
  );
}
