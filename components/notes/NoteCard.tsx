"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { formatUpdatedAt, noteUrl } from "@/lib/utils/notes";

interface NoteCardProps {
  note: Note;
  compact?: boolean;
}

export function NoteCard({ note, compact = false }: NoteCardProps) {
  const router = useRouter();

  async function toggleFavorite(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notes")
      .update({ is_favorite: !note.is_favorite })
      .eq("id", note.id);
    router.refresh();
  }

  return (
    <Link
      href={noteUrl(note)}
      className="group block rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5 transition-colors hover:bg-white"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone="blue">{note.topic}</Badge>
          <Badge>{note.note_type}</Badge>
          <Badge tone={note.visibility === "public" ? "green" : "default"}>{note.visibility}</Badge>
        </div>
        <button
          type="button"
          aria-label={note.is_favorite ? "Remove favorite" : "Mark favorite"}
          onClick={toggleFavorite}
          className="text-[#0e3b69]"
        >
          {note.is_favorite ? (
            <BookmarkCheck className="h-5 w-5 fill-[#0e3b69]" aria-hidden="true" />
          ) : (
            <Bookmark className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold leading-7 text-[#1a1c1c] group-hover:text-[#0e3b69]">
          {note.title}
        </h2>
        <span className="shrink-0 text-[13px] font-medium tracking-[0.04em] text-[#43474f]">
          {formatUpdatedAt(note.updated_at)}
        </span>
      </div>

      {note.description ? (
        <p className={compact ? "mt-3 line-clamp-2 text-sm text-[#43474f]" : "mt-3 line-clamp-3 text-base leading-7 text-[#43474f]"}>
          {note.description}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <DifficultyBadge value={note.difficulty} />
        {note.tags.slice(0, compact ? 2 : 4).map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </Link>
  );
}
