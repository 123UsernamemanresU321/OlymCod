"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { createClient } from "@/lib/supabase/client";
import type { NoteVersion } from "@/lib/types";

interface VersionHistoryProps {
  noteId: string | null;
}

export function VersionHistory({ noteId }: VersionHistoryProps) {
  const router = useRouter();
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [selected, setSelected] = useState<NoteVersion | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!noteId || !open) return;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("note_versions")
        .select("*")
        .eq("note_id", noteId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) setVersions((data ?? []) as NoteVersion[]);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [noteId, open]);

  async function restore(version: NoteVersion) {
    if (!noteId || !window.confirm("Restore this older version into the current note?")) return;
    setBusy(true);
    const metadata = version.metadata as {
      slug?: string;
      topic?: string;
      note_type?: string;
      difficulty?: number | null;
      description?: string | null;
      tags?: string[];
      visibility?: string;
      is_favorite?: boolean;
    };
    const supabase = createClient();
    await supabase
      .from("notes")
      .update({
        title: version.title ?? "Untitled",
        body_markdown: version.body_markdown,
        topic: metadata.topic,
        note_type: metadata.note_type,
        difficulty: metadata.difficulty,
        description: metadata.description,
        tags: metadata.tags,
        visibility: metadata.visibility,
        is_favorite: metadata.is_favorite
      })
      .eq("id", noteId);
    setBusy(false);
    router.refresh();
  }

  if (!noteId) return null;

  return (
    <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#1a1c1c]">Version History</h3>
          <p className="mt-1 text-sm text-[#43474f]">Previous cloud saves are kept as restore points.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen((current) => !current)}>
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      {open ? (
        <div className="mt-4 grid gap-3">
          {versions.length ? (
            versions.map((version) => (
              <div key={version.id} className="rounded border border-[#d5d7de] bg-white p-3">
                <button
                  type="button"
                  className="text-left text-sm font-semibold text-[#0e3b69]"
                  onClick={() => setSelected(selected?.id === version.id ? null : version)}
                >
                  {new Date(version.created_at).toLocaleString()} · {version.title ?? "Untitled"}
                </button>
                {selected?.id === version.id ? (
                  <div className="mt-3">
                    <div className="max-h-72 overflow-y-auto rounded border border-[#d5d7de] p-3">
                      <MarkdownPreview markdown={version.body_markdown ?? ""} />
                    </div>
                    <Button type="button" className="mt-3" variant="secondary" disabled={busy} onClick={() => void restore(version)}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Restore version
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-[#43474f]">No saved versions yet.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
