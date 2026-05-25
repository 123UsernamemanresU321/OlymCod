"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { NoteCard } from "@/components/notes/NoteCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClassName } from "@/components/ui/Field";
import { MATH_TOPICS, NOTE_TYPES, SPECIAL_TOPICS, topicIncludes } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { Note, SavedView, SortKey } from "@/lib/types";
import { matchesNoteSearch, sortNotes } from "@/lib/utils/notes";

interface NotesLibraryClientProps {
  notes: Note[];
  savedViews?: SavedView[];
}

export function NotesLibraryClient({ notes, savedViews = [] }: NotesLibraryClientProps) {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState(params.get("topic") ?? "All");
  const [noteType, setNoteType] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("updated");
  const [viewMessage, setViewMessage] = useState<string | null>(null);
  const activeFilterCount =
    Number(topic !== "All") + Number(noteType !== "All") + Number(difficulty !== "All") + Number(favoritesOnly);

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

  function loadView(view: SavedView) {
    const config = view.config as Partial<{
      query: string;
      topic: string;
      noteType: string;
      difficulty: string;
      favoritesOnly: boolean;
      sort: SortKey;
    }>;
    setQuery(config.query ?? "");
    setTopic(config.topic ?? "All");
    setNoteType(config.noteType ?? "All");
    setDifficulty(config.difficulty ?? "All");
    setFavoritesOnly(Boolean(config.favoritesOnly));
    setSort(config.sort ?? "updated");
  }

  async function saveView() {
    const name = window.prompt("Saved view name", topic !== "All" ? `${topic} notes` : "Custom notes view");
    if (!name) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setViewMessage("You must be logged in.");
      return;
    }
    const { error } = await supabase.from("saved_views").insert({
      user_id: user.id,
      name,
      target_page: "notes",
      description: `${filtered.length} matching notes when saved.`,
      config: { query, topic, noteType, difficulty, favoritesOnly, sort }
    });
    setViewMessage(error ? error.message : "Saved view created. Refresh to see it in the list.");
  }

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

      <details className="mt-8 rounded-lg border border-[#c3c6d0] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-[#1a1c1c]">Filters and sorting</span>
            <span className="text-xs text-[#5d6470]">
              {activeFilterCount || "No"} active filters · {filtered.length} matching notes
            </span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3b69]">Open</span>
        </summary>
        <div className="grid gap-3 border-t border-[#e2e4ea] p-4 sm:grid-cols-2 lg:grid-cols-6">
          <select className={inputClassName()} value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option>All</option>
            {[...MATH_TOPICS, ...SPECIAL_TOPICS].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select className={inputClassName()} value={noteType} onChange={(event) => setNoteType(event.target.value)}>
            <option>All</option>
            {NOTE_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select className={inputClassName()} value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option>All</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                Concept level {value}
              </option>
            ))}
          </select>
          <select className={inputClassName()} value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="updated">Recently updated</option>
            <option value="title">Title</option>
            <option value="difficulty">Concept level</option>
            <option value="topic">Topic</option>
          </select>
          <label className="flex min-h-10 items-center gap-2 rounded border border-[#c3c6d0] bg-[#f9f9f9] px-3 text-sm font-medium text-[#43474f]">
            <input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} />
            Favorites
          </label>
          <button
            type="button"
            className="rounded border border-[#c3c6d0] px-3 py-2 text-sm font-medium text-[#0e3b69] hover:bg-[#eef4ff]"
            onClick={() => {
              setTopic("All");
              setNoteType("All");
              setDifficulty("All");
              setFavoritesOnly(false);
            }}
          >
            Clear filters
          </button>
        </div>
      </details>

      <section className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#d5d7de] bg-white p-3 text-sm">
        <span className="font-medium text-[#43474f]">Saved views</span>
        {savedViews.map((view) => (
          <button key={view.id} type="button" className="rounded border border-[#c3c6d0] px-2 py-1 text-[#0e3b69] hover:bg-[#eef4ff]" onClick={() => loadView(view)}>
            {view.name}
          </button>
        ))}
        <button type="button" className="ml-auto rounded border border-[#2c5282] px-2 py-1 text-[#0e3b69] hover:bg-[#eef4ff]" onClick={() => void saveView()}>
          Save current filters
        </button>
        {viewMessage ? <span className="basis-full text-xs text-[#43474f]">{viewMessage}</span> : null}
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
