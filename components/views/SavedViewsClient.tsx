"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { SavedView } from "@/lib/types";

export function SavedViewsClient({ views }: { views: SavedView[] }) {
  const [message, setMessage] = useState<string | null>(null);

  async function deleteView(view: SavedView) {
    if (!window.confirm(`Delete saved view "${view.name}"?`)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("saved_views").delete().eq("id", view.id).eq("user_id", user.id);
    setMessage(error ? error.message : "Saved view deleted. Refresh to update the list.");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-10">
      <h1 className="text-3xl font-semibold text-[#1a1c1c]">Saved Views</h1>
      <p className="mt-2 text-sm leading-6 text-[#43474f]">Reusable filters for Notes and Manage pages.</p>
      {message ? <p className="mt-4 rounded border border-[#d5d7de] bg-white p-3 text-sm text-[#43474f]">{message}</p> : null}
      <section className="mt-6 grid gap-3">
        {views.map((view) => (
          <article key={view.id} className="rounded-lg border border-[#c3c6d0] bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1a1c1c]">{view.name}</h2>
                <p className="mt-1 text-sm text-[#43474f]">{view.target_page} · {view.description ?? "No description"}</p>
              </div>
              <div className="flex gap-2">
                <Link href={view.target_page === "manage" ? "/app/manage" : "/app/notes"} className="inline-flex min-h-9 items-center justify-center rounded border border-[#2c5282] px-3 py-2 text-sm font-medium text-[#0e3b69] hover:bg-[#eef4ff]">
                  Open
                </Link>
                <Button type="button" variant="danger" onClick={() => void deleteView(view)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
            <pre className="mt-3 max-h-32 overflow-auto rounded bg-[#f9f9f9] p-3 text-xs text-[#43474f]">{JSON.stringify(view.config, null, 2)}</pre>
          </article>
        ))}
        {!views.length ? <p className="rounded border border-dashed border-[#c3c6d0] p-6 text-sm text-[#43474f]">No saved views yet. Save filters from the Notes page.</p> : null}
      </section>
    </div>
  );
}
