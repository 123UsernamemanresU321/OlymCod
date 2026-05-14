"use client";

import { Archive, BookOpen, Image as ImageIcon, Sigma } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { TOPICS } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { formatUpdatedAt } from "@/lib/utils/notes";
import { titleToSlug } from "@/lib/utils/slug";

interface InboxClientProps {
  notes: Note[];
}

function parseTopicGuess(description: string | null) {
  return description?.replace(/^Topic guess:\s*/i, "") || "Number Theory";
}

function isKnownTopic(topic: string) {
  return TOPICS.some((item) => item === topic);
}

export function InboxClient({ notes }: InboxClientProps) {
  const router = useRouter();
  const [rawIdea, setRawIdea] = useState("");
  const [topicGuess, setTopicGuess] = useState("Number Theory");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRoughNote() {
    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error(userError?.message ?? "You must be logged in.");
      if (!rawIdea.trim()) throw new Error("Write a rough note first.");

      const title = rawIdea.trim().split("\n")[0].slice(0, 80) || "Inbox note";
      const slug = `${titleToSlug(title)}-${Date.now()}`;
      const { error: insertError } = await supabase.from("notes").insert({
        user_id: user.id,
        title,
        slug,
        topic: "Inbox",
        note_type: "Inbox",
        difficulty: 1,
        description: `Topic guess: ${topicGuess}`,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        body_markdown: rawIdea.trim(),
        diagram_urls: [],
        is_favorite: false,
        is_archived: false
      });

      if (insertError) throw insertError;
      setRawIdea("");
      setTags("");
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not capture note.");
    } finally {
      setBusy(false);
    }
  }

  async function archive(note: Note) {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error(userError?.message ?? "You must be logged in.");
      const { error: archiveError } = await supabase
        .from("notes")
        .update({ is_archived: true })
        .eq("id", note.id);
      if (archiveError) throw archiveError;
      router.refresh();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Could not archive note.");
    }
  }

  async function convert(note: Note) {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error(userError?.message ?? "You must be logged in.");

      const guessedTopic = parseTopicGuess(note.description);
      const { error: convertError } = await supabase
        .from("notes")
        .update({
          topic: isKnownTopic(guessedTopic) ? guessedTopic : "Number Theory",
          note_type: "Technique",
          title: note.title || "Converted note",
          description: null,
          difficulty: 3
        })
        .eq("id", note.id);

      if (convertError) throw convertError;
      router.push(`/app/notes/${note.id}/edit`);
      router.refresh();
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "Could not convert note.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-10">
      <header>
        <h1 className="text-3xl font-semibold text-[#1a1c1c]">Inbox</h1>
        <p className="mt-2 text-base leading-7 text-[#43474f]">
          Fast-capture for raw ideas and problem fragments.
        </p>
      </header>

      <section className="mt-8 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-4">
        <textarea
          className={inputClassName("min-h-32 bg-white")}
          value={rawIdea}
          onChange={(event) => setRawIdea(event.target.value)}
          placeholder="Capture an idea, formula, or thought..."
        />
        <div className="mt-4 grid gap-3 border-t border-[#c3c6d0] pt-4 sm:grid-cols-[1fr_1fr_auto]">
          <select className={inputClassName()} value={topicGuess} onChange={(event) => setTopicGuess(event.target.value)}>
            {TOPICS.filter((topic) => topic !== "Inbox").map((topic) => (
              <option key={topic}>{topic}</option>
            ))}
          </select>
          <input
            className={inputClassName()}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="tags, comma separated"
          />
          <Button type="button" onClick={createRoughNote} disabled={busy}>
            Quick Capture
          </Button>
        </div>
        <div className="mt-3 flex gap-2 text-[#43474f]">
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
          <Sigma className="h-4 w-4" aria-hidden="true" />
        </div>
        {error ? <p className="mt-3 text-sm text-[#8f1d15]">{error}</p> : null}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-medium text-[#1a1c1c]">Recent Rough Notes</h2>
        <div className="mt-4 grid gap-4">
          {notes.length ? (
            notes.map((note) => (
              <article key={note.id} className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[13px] font-medium tracking-[0.04em] text-[#43474f]">
                    {formatUpdatedAt(note.created_at)}
                  </span>
                  <Badge tone="blue">{parseTopicGuess(note.description)}</Badge>
                </div>
                <p className="mt-3 line-clamp-3 text-base leading-7 text-[#43474f]">
                  {note.body_markdown}
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#c3c6d0] pt-4">
                  <Button type="button" variant="secondary" onClick={() => void archive(note)}>
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    Archive
                  </Button>
                  <Button type="button" onClick={() => void convert(note)}>
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Convert to Full Note
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-[#c3c6d0] p-5 text-sm text-[#43474f]">
              Rough notes will appear here.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
