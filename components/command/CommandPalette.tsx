"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Command, FileText, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { TOPICS } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { MistakeLog, Note, ProblemLog, QuickCapture } from "@/lib/types";
import { inputClassName } from "@/components/ui/Field";

type ResultItem = {
  id: string;
  title: string;
  group: "Notes" | "Problems" | "Mistakes" | "Captures" | "Actions" | "Topics";
  href: string;
  preview?: string | null;
  tags?: string[];
};

function normalized(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function matches(item: ResultItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (q.startsWith("tag:")) {
    const tag = q.slice(4);
    return item.tags?.some((itemTag) => itemTag.toLowerCase().includes(tag)) ?? false;
  }
  if (q.startsWith("topic:")) {
    const topic = q.slice(6);
    return item.preview?.toLowerCase().includes(topic) ?? false;
  }
  if (q.startsWith("type:")) {
    const type = q.slice(5);
    return item.preview?.toLowerCase().includes(type) ?? false;
  }
  if (q.startsWith("status:")) {
    const status = q.slice(7);
    return item.preview?.toLowerCase().includes(status) ?? false;
  }
  return (
    normalized(item.title).includes(q) ||
    normalized(item.preview).includes(q) ||
    (item.tags ?? []).some((tag) => normalized(tag).includes(q))
  );
}

export function CommandPalette({ enableShortcut = true }: { enableShortcut?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [problems, setProblems] = useState<ProblemLog[]>([]);
  const [mistakes, setMistakes] = useState<MistakeLog[]>([]);
  const [captures, setCaptures] = useState<QuickCapture[]>([]);

  useEffect(() => {
    if (!enableShortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableShortcut]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [notesResult, problemsResult, mistakesResult, capturesResult] = await Promise.all([
        supabase.from("notes").select("*").eq("is_archived", false).order("updated_at", { ascending: false }).limit(50),
        supabase.from("problem_logs").select("*").order("updated_at", { ascending: false }).limit(30),
        supabase.from("mistake_logs").select("*").order("updated_at", { ascending: false }).limit(30),
        supabase.from("quick_captures").select("*").eq("is_archived", false).order("created_at", { ascending: false }).limit(30)
      ]);
      if (cancelled) return;
      setNotes((notesResult.data ?? []) as Note[]);
      setProblems((problemsResult.data ?? []) as ProblemLog[]);
      setMistakes((mistakesResult.data ?? []) as MistakeLog[]);
      setCaptures((capturesResult.data ?? []) as QuickCapture[]);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const results = useMemo(() => {
    const actions: ResultItem[] = [
      { id: "new-note", group: "Actions", title: "Create new note", href: "/app/notes/new", preview: "new note theorem technique formula" },
      { id: "capture", group: "Actions", title: "Open Capture", href: "/app/capture", preview: "quick capture inbox" },
      { id: "problems", group: "Actions", title: "Open Problem Log", href: "/app/problems", preview: "problem log" },
      { id: "mistakes", group: "Actions", title: "Open Mistake Log", href: "/app/mistakes", preview: "mistake log" },
      { id: "review", group: "Actions", title: "Open Review", href: "/app/review-notes", preview: "review due practice" },
      { id: "diagrams", group: "Actions", title: "Open Diagrams", href: "/app/diagrams", preview: "geometry diagram manager" },
      { id: "settings", group: "Actions", title: "Open Settings", href: "/app/settings", preview: "export backup account" }
    ];

    const topicItems = TOPICS.filter((topic) => topic !== "Inbox").map((topic) => ({
      id: `topic-${topic}`,
      group: "Topics" as const,
      title: `Jump to ${topic}`,
      href: `/app/notes?topic=${encodeURIComponent(topic)}`,
      preview: topic
    }));

    const items: ResultItem[] = [
      ...actions,
      ...topicItems,
      ...notes.map((note) => ({
        id: note.id,
        group: "Notes" as const,
        title: note.title,
        href: `/app/notes/${note.id}`,
        preview: `${note.topic} ${note.note_type} ${note.description ?? ""} ${note.body_markdown.slice(0, 180)}`,
        tags: note.tags
      })),
      ...problems.map((problem) => ({
        id: problem.id,
        group: "Problems" as const,
        title: problem.title,
        href: `/app/problems/${problem.id}`,
        preview: `${problem.status} ${problem.olympiad ?? ""} ${problem.key_idea ?? ""}`,
        tags: problem.tags
      })),
      ...mistakes.map((mistake) => ({
        id: mistake.id,
        group: "Mistakes" as const,
        title: mistake.title,
        href: "/app/mistakes",
        preview: `${mistake.topic ?? ""} ${mistake.mistake_type ?? ""} ${mistake.description}`,
        tags: []
      })),
      ...captures.map((capture) => ({
        id: capture.id,
        group: "Captures" as const,
        title: capture.raw_text.slice(0, 72) || "Untitled capture",
        href: `/app/capture?convert=${capture.id}`,
        preview: `${capture.capture_type} ${capture.topic_guess ?? ""} ${capture.raw_text}`,
        tags: capture.tags
      }))
    ];

    return items.filter((item) => matches(item, query)).slice(0, 24);
  }, [captures, mistakes, notes, problems, query]);

  const groups = ["Actions", "Notes", "Problems", "Mistakes", "Captures", "Topics"] as const;

  function openResult(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-[#c3c6d0] bg-white px-3 py-2 text-[13px] font-medium text-[#0e3b69] hover:bg-[#eef4ff]"
      >
        <Command className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Command</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30 p-3 sm:p-6">
          <div className="mx-auto mt-12 max-w-2xl rounded-lg border border-[#c3c6d0] bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-[#c3c6d0] p-3">
              <Search className="h-4 w-4 text-[#0e3b69]" aria-hidden="true" />
              <input
                autoFocus
                className={inputClassName("border-0 bg-transparent p-0 focus:ring-0")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notes, problems, tags, topics, or actions..."
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded text-[#43474f] hover:bg-[#f9f9f9]"
                aria-label="Close command palette"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-3">
              {groups.map((group) => {
                const groupResults = results.filter((item) => item.group === group);
                if (!groupResults.length) return null;
                return (
                  <section key={group} className="mb-4">
                    <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#43474f]">
                      {group}
                    </h2>
                    <div className="grid gap-1">
                      {groupResults.map((item) => (
                        <button
                          key={`${item.group}-${item.id}`}
                          type="button"
                          onClick={() => openResult(item.href)}
                          className="flex items-start gap-3 rounded p-3 text-left hover:bg-[#eef4ff]"
                        >
                          {item.group === "Notes" ? (
                            <FileText className="mt-0.5 h-4 w-4 text-[#0e3b69]" aria-hidden="true" />
                          ) : (
                            <BookOpen className="mt-0.5 h-4 w-4 text-[#0e3b69]" aria-hidden="true" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[#1a1c1c]">
                              {item.title}
                            </span>
                            {item.preview ? (
                              <span className="line-clamp-1 text-[12px] text-[#43474f]">
                                {item.preview}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
              {!results.length ? (
                <p className="p-4 text-sm text-[#43474f]">
                  No results. Try `tag:modular`, `topic:geometry`, or `status:needs_practice`.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
