"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Command, FileText, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { TOPICS } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { Diagram, MistakeLog, Note, NoteTemplate, ProblemLog, QuickCapture, SavedView } from "@/lib/types";
import { inputClassName } from "@/components/ui/Field";
import { LoadingSkeleton } from "@/components/ui/Page";

type ResultItem = {
  id: string;
  title: string;
  group: "Notes" | "Problems" | "Mistakes" | "Captures" | "Media" | "Templates" | "Views" | "Actions" | "Topics";
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
  const [media, setMedia] = useState<Diagram[]>([]);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enableShortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableShortcut]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return;
        const [notesResult, problemsResult, mistakesResult, capturesResult, mediaResult, templatesResult, viewsResult] = await Promise.all([
          supabase.from("notes").select("*").eq("user_id", user.id).eq("is_archived", false).order("updated_at", { ascending: false }).limit(50),
          supabase.from("problem_logs").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(30),
          supabase.from("mistake_logs").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(30),
          supabase.from("quick_captures").select("*").eq("user_id", user.id).eq("is_archived", false).order("created_at", { ascending: false }).limit(30),
          supabase.from("diagrams").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
          supabase.from("note_templates").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(20),
          supabase.from("saved_views").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(20)
        ]);
        if (cancelled) return;
        setNotes((notesResult.data ?? []) as Note[]);
        setProblems((problemsResult.data ?? []) as ProblemLog[]);
        setMistakes((mistakesResult.data ?? []) as MistakeLog[]);
        setCaptures((capturesResult.data ?? []) as QuickCapture[]);
        setMedia((mediaResult.data ?? []) as Diagram[]);
        setTemplates((templatesResult.data ?? []) as NoteTemplate[]);
        setViews((viewsResult.data ?? []) as SavedView[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
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
      { id: "revision-pack", group: "Actions", title: "Generate Contest Revision Pack", href: "/app/revision-pack", preview: "before contest revision pack weak notes false uses triggers" },
      { id: "mastery", group: "Actions", title: "Open Mastery Heatmap", href: "/app/mastery", preview: "mastery heatmap weak topics confidence mistakes" },
      { id: "graph", group: "Actions", title: "Open Note Graph", href: "/app/graph", preview: "visual relationships prerequisites links" },
      { id: "manage", group: "Actions", title: "Open Bulk Metadata Manager", href: "/app/manage", preview: "bulk edit tags topics levels visibility" },
      { id: "media", group: "Actions", title: "Open Media Library", href: "/app/media", preview: "geometry diagram media manager" },
      { id: "workspace", group: "Actions", title: "Open Workspace", href: "/app/workspace", preview: "multi pane editor reference notes" },
      { id: "templates", group: "Actions", title: "Open Templates", href: "/app/templates", preview: "note templates custom built in" },
      { id: "import", group: "Actions", title: "Open Smart Importer", href: "/app/import", preview: "import markdown text split headings" },
      { id: "taxonomy", group: "Actions", title: "Open Tags & Topics", href: "/app/taxonomy", preview: "tag counts topic counts merge rename taxonomy" },
      { id: "views", group: "Actions", title: "Open Saved Views", href: "/app/views", preview: "saved filters dashboards" },
      { id: "merge", group: "Actions", title: "Merge Notes", href: "/app/merge", preview: "combine notes archive originals" },
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
        preview: `${note.topic} ${note.note_type} ${note.description ?? ""} ${(note.recognition_triggers ?? []).join(" ")} ${(note.false_uses ?? []).join(" ")} ${note.body_markdown.slice(0, 180)}`,
        tags: note.tags
      })),
      ...problems.map((problem) => ({
        id: problem.id,
        group: "Problems" as const,
        title: problem.title,
        href: `/app/problems/${problem.id}`,
        preview: `${problem.status} ${problem.topic ?? ""} ${problem.olympiad ?? ""} ${problem.mistake_category ?? ""} ${problem.key_idea ?? ""}`,
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
      })),
      ...media.map((asset) => ({
        id: asset.id,
        group: "Media" as const,
        title: asset.title || asset.caption || asset.filename,
        href: "/app/media",
        preview: `${asset.filename} ${asset.caption ?? ""} ${asset.alt_text ?? ""}`,
        tags: asset.tags ?? []
      })),
      ...templates.map((template) => ({
        id: template.id,
        group: "Templates" as const,
        title: template.name,
        href: "/app/templates",
        preview: `${template.note_type} ${template.topic ?? ""} ${template.description ?? ""}`,
        tags: template.default_tags
      })),
      ...views.map((view) => ({
        id: view.id,
        group: "Views" as const,
        title: view.name,
        href: view.target_page === "manage" ? "/app/manage" : "/app/notes",
        preview: `${view.target_page} ${view.description ?? ""}`,
        tags: []
      }))
    ];

    return items.filter((item) => matches(item, query)).slice(0, 24);
  }, [captures, media, mistakes, notes, problems, query, templates, views]);

  const groups = ["Actions", "Notes", "Problems", "Mistakes", "Captures", "Media", "Templates", "Views", "Topics"] as const;

  function openResult(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const overlay =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[1000] bg-black/45 p-3 backdrop-blur-[1px] sm:p-6">
            <div
              className="mx-auto mt-12 max-w-2xl rounded-lg border border-[#c3c6d0] bg-white shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
            >
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
                {loading ? (
                  <div className="grid gap-2 p-2">
                    <LoadingSkeleton className="h-12" />
                    <LoadingSkeleton className="h-12" />
                    <LoadingSkeleton className="h-12" />
                  </div>
                ) : null}
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
                {!loading && !results.length ? (
                  <p className="p-4 text-sm text-[#43474f]">
                    No results. Try `tag:modular`, `topic:geometry`, or `status:needs_practice`.
                  </p>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

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
      {overlay}
    </>
  );
}
