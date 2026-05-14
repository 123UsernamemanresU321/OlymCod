"use client";

import { Bookmark, BookmarkCheck, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";

interface NoteViewActionsProps {
  note: Note;
}

export function NoteViewActions({ note }: NoteViewActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleFavorite() {
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error(userError?.message ?? "You must be logged in.");
      const { error: updateError } = await supabase
        .from("notes")
        .update({ is_favorite: !note.is_favorite })
        .eq("id", note.id);
      if (updateError) throw updateError;
      router.refresh();
    } catch (favoriteError) {
      setError(favoriteError instanceof Error ? favoriteError.message : "Could not update favorite.");
    }
  }

  async function deleteNote() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error(userError?.message ?? "You must be logged in.");

      const { error: deleteError } = await supabase
        .from("notes")
        .delete()
        .eq("id", note.id);
      if (deleteError) throw deleteError;

      router.push("/app/notes");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete note.");
      setDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5">
        {error ? (
          <p className="col-span-2 rounded border border-[#ffb4ab] bg-[#ffdad6] p-3 text-sm text-[#8f1d15]">
            {error}
          </p>
        ) : null}
        <Link
          href={`/app/notes/${note.id}/edit`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-white hover:bg-[#23466f]"
        >
          <Edit className="h-4 w-4" aria-hidden="true" />
          Edit
        </Link>
        <Button type="button" variant="secondary" onClick={toggleFavorite}>
          {note.is_favorite ? (
            <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Bookmark className="h-4 w-4" aria-hidden="true" />
          )}
          Favorite
        </Button>
        <Button
          type="button"
          variant="danger"
          className="col-span-2"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </Button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete note"
        body={`Are you sure you want to permanently remove "${note.title}"? This action cannot be undone.`}
        confirmLabel="Delete note"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteNote()}
        busy={busy}
      />
    </>
  );
}
