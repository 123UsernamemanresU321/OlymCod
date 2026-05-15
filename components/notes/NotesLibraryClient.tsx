"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { NoteCard } from "@/components/notes/NoteCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClassName } from "@/components/ui/Field";
import { MATH_TOPICS, NOTE_TYPES, SPECIAL_TOPICS, topicIncludes } from "@/lib/constants/notes";
import type { Note, SortKey } from "@/lib/types";
import { matchesNoteSearch, sortNotes } from "@/lib/utils/notes";

interface NotesLibraryClientProps {
  notes: Note[];
}

export function NotesLibraryClient({ notes }: NotesLibraryClientProps) {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState(params.get("topic") ?? "All");
  const [noteType, setNoteType] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("updated");

  const filtered = useMemo(() => {
    const result = notes.filter((note) => {
      if (!matchesNoteSearch(note, query)) return false;
      if (!topicIncludes(note.topic, topic)) return false;
      if (noteType !== "All" && note.note_type !== noteType) return false;
      if (difficulty !== "All" && note.difficulty !== Number(difficulty)) return false;
      if (favoritesOnly && !note.is_favorite) return false;
      return true;
    });

    return sortNotes(result, sort);
  }, [notes, query, topic, noteType, difficulty, favoritesOnly, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#1a1c1c]">Notes Library</h1>
          <p className="mt-2 text-[#43474f]">Search and filter your private Olympiad registry.</p>
        </div>
        <label className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#43474f]" />
          <input
            className={inputClassName("pl-10")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes..."
          />
        </label>
      </header>

      <section className="mt-8 flex flex-wrap items-center gap-3 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-4">
        <span className="text-[13px] font-medium tracking-[0.04em] text-[#43474f]">Filter</span>
        <select className={inputClassName("w-auto min-w-32")} value={topic} onChange={(event) => setTopic(event.target.value)}>
          <option>All</option>
          {[...MATH_TOPICS, ...SPECIAL_TOPICS].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className={inputClassName("w-auto min-w-32")} value={noteType} onChange={(event) => setNoteType(event.target.value)}>
          <option>All</option>
          {NOTE_TYPES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className={inputClassName("w-auto min-w-36")} value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
          <option>All</option>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>
              Difficulty {value}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm font-medium text-[#43474f]">
          <input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} />
          Favorites
        </label>
        <span className="ml-auto text-[13px] font-medium tracking-[0.04em] text-[#43474f]">Sort</span>
        <select className={inputClassName("w-auto min-w-44")} value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
          <option value="updated">Recently updated</option>
          <option value="title">Title</option>
          <option value="difficulty">Difficulty</option>
          <option value="topic">Topic</option>
        </select>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length ? (
          filtered.map((note) => <NoteCard key={note.id} note={note} />)
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState
              variant={notes.length ? "search" : "notes"}
              title={notes.length ? "No matching notes" : "No notes yet"}
              body={
                notes.length
                  ? "Try a different search term or clear one of the filters."
                  : "Create your first private Olympiad note."
              }
              actionHref="/app/notes/new"
              actionLabel="New Note"
            />
          </div>
        )}
      </section>
    </div>
  );
}
