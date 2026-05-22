"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { markdownRehypePlugins, markdownRemarkPlugins, normalizeMathDelimiters } from "@/lib/markdown/rendering";
import { extractSpecificSection } from "@/lib/markdown/sections";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";

interface InlineNoteEmbedProps {
  reference: string;
}

function parseReference(reference: string) {
  const [title, section] = reference.split("#").map((part) => part.trim());
  return { title, section };
}

export function InlineNoteEmbed({ reference }: InlineNoteEmbedProps) {
  const [{ note, body, error }, setState] = useState<{ note: Note | null; body: string; error: string | null }>({
    note: null,
    body: "",
    error: null
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { title, section } = parseReference(reference);
      if (!title) {
        setState({ note: null, body: "", error: "Missing embedded note title." });
        return;
      }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ note: null, body: "", error: "Log in to view embedded notes." });
        return;
      }
      const { data, error: queryError } = await supabase
        .from("notes")
        .select("*")
        .ilike("title", title)
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (queryError || !data) {
        setState({ note: null, body: "", error: `Embedded note not found: ${title}` });
        return;
      }
      const embeddedNote = data as Note;
      const sectionBody = section ? extractSpecificSection(embeddedNote.body_markdown, section)?.content : null;
      setState({
        note: embeddedNote,
        body: (sectionBody || embeddedNote.description || embeddedNote.body_markdown).replace(/\[\[note:[^\]]+\]\]/g, "").slice(0, 1800),
        error: null
      });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (error) {
    return (
      <span className="my-3 block rounded border border-[#ffb4ab] bg-[#fff7f5] p-3 text-sm text-[#8f1d15]">
        {error}
      </span>
    );
  }

  if (!note) {
    return (
      <span className="my-3 block rounded border border-[#d5d7de] bg-[#f9f9f9] p-3 text-sm text-[#43474f]">
        Loading embedded note...
      </span>
    );
  }

  return (
    <aside className="my-4 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/app/notes/${note.id}`} className="text-sm font-semibold text-[#0e3b69]">
          {note.title}
        </Link>
        <span className="text-[11px] uppercase tracking-[0.08em] text-[#43474f]">embedded note</span>
      </div>
      <div className="codex-prose text-sm">
        <ReactMarkdown remarkPlugins={markdownRemarkPlugins} rehypePlugins={markdownRehypePlugins}>
          {normalizeMathDelimiters(body || "No preview available.")}
        </ReactMarkdown>
      </div>
    </aside>
  );
}
