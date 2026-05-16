"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { inputClassName } from "@/components/ui/Field";
import { MATH_TOPICS, topicIncludes } from "@/lib/constants/notes";
import type { Note } from "@/lib/types";
import { matchesNoteSearch } from "@/lib/utils/notes";

interface FormulaBankClientProps {
  notes: Note[];
}

const formulaCategories = ["All", ...MATH_TOPICS];

export function FormulaBankClient({ notes }: FormulaBankClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(
    () =>
      notes.filter((note) => {
        if (!matchesNoteSearch(note, query)) return false;
        if (!topicIncludes(note.topic, category)) return false;
        return true;
      }),
    [notes, query, category]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-10">
      <header>
        <h1 className="text-3xl font-semibold text-[#1a1c1c]">Formula Bank</h1>
        <label className="relative mt-4 block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#43474f]" />
          <input
            className={inputClassName("pl-10")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search formulas..."
          />
        </label>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {formulaCategories.map((item) => (
            <button
              key={item}
              type="button"
              className={`shrink-0 rounded border px-4 py-2 text-[13px] font-medium ${
                item === category
                  ? "border-[#2c5282] bg-[#2c5282] text-white"
                  : "border-[#c3c6d0] bg-[#f9f9f9] text-[#0e3b69]"
              }`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-8 grid gap-4">
        {filtered.map((note) => (
          <Link
            href={`/app/notes/${note.id}`}
            key={note.id}
            className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#1a1c1c]">
                <InlineMarkdown text={note.title} />
              </h2>
              <Badge tone="blue">{note.topic}</Badge>
            </div>
            <div className="mt-4 rounded border-l-4 border-[#2c5282] bg-white px-4 py-3">
              <MarkdownPreview markdown={note.body_markdown.split("\n").slice(0, 8).join("\n")} />
            </div>
            {note.description ? (
              <InlineMarkdown text={note.description} className="mt-4 block text-sm leading-6 text-[#43474f]" />
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <DifficultyBadge value={note.difficulty} noteType={note.note_type} />
              {note.tags.slice(0, 3).map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </Link>
        ))}
        {!filtered.length ? (
          <p className="rounded-lg border border-[#c3c6d0] p-6 text-center text-[#43474f]">
            No formula notes match this view.
          </p>
        ) : null}
      </section>
    </div>
  );
}
