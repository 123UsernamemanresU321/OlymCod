"use client";

import { Button } from "@/components/ui/Button";
import { PageShell, StatusMessage } from "@/components/ui/Page";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell size="md">
      <StatusMessage tone="error">
        <p className="font-semibold">The app could not finish loading this view.</p>
        <p className="mt-1">{error.message || "Try again, or return to the dashboard."}</p>
      </StatusMessage>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.location.assign("/app")}>
          Dashboard
        </Button>
      </div>
    </PageShell>
  );
}
