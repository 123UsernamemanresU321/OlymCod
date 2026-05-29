"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { parseMarkdownHeadings, slugHeading } from "@/lib/markdown/sections";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type ReaderWidth = "comfortable" | "wide" | "full";
type ReaderText = "compact" | "standard" | "large";
type ReaderPreferences = {
  width: ReaderWidth;
  text: ReaderText;
  showSidebar: boolean;
};

interface PublicNoteReaderProps {
  note: Note;
  diagrams: Array<{ path: string; signedUrl: string }>;
}

const STORAGE_KEY = "olympiad-codex-public-reader";
const defaultPreferences: ReaderPreferences = {
  width: "wide",
  text: "standard",
  showSidebar: true
};

const widthOptions: Array<{ value: ReaderWidth; label: string }> = [
  { value: "comfortable", label: "Comfortable" },
  { value: "wide", label: "Wide" },
  { value: "full", label: "Full" }
];

const textOptions: Array<{ value: ReaderText; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "standard", label: "Standard" },
  { value: "large", label: "Large" }
];

function stripMarkdown(value: string) {
  return value
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[`*_~$\\]/g, "")
    .trim();
}

function readSavedPreferences(): ReaderPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultPreferences;
    const parsed = JSON.parse(saved) as Partial<ReaderPreferences>;
    return {
      width: parsed.width && widthOptions.some((option) => option.value === parsed.width) ? parsed.width : defaultPreferences.width,
      text: parsed.text && textOptions.some((option) => option.value === parsed.text) ? parsed.text : defaultPreferences.text,
      showSidebar: typeof parsed.showSidebar === "boolean" ? parsed.showSidebar : defaultPreferences.showSidebar
    };
  } catch {
    return defaultPreferences;
  }
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#5d6470]">{label}</span>
      <div className="flex rounded border border-[#c3c6d0] bg-[#f9f9f9] p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium text-[#43474f] transition hover:bg-white",
              value === option.value && "bg-white text-[#0e3b69] shadow-[inset_0_0_0_1px_#c3c6d0]"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PublicNoteReader({ note, diagrams }: PublicNoteReaderProps) {
  const [preferences, setPreferences] = useState<ReaderPreferences>(() => readSavedPreferences());
  const { width, text, showSidebar } = preferences;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ width, text, showSidebar }));
    } catch {
      // Safari private browsing or locked-down browsers may block persistence.
    }
  }, [showSidebar, text, width]);

  function updatePreferences(update: Partial<ReaderPreferences>) {
    setPreferences((current) => ({ ...current, ...update }));
  }

  const headings = useMemo(
    () =>
      parseMarkdownHeadings(note.body_markdown)
        .filter((heading) => heading.level >= 2 && heading.level <= 3)
        .slice(0, 12)
        .map((heading) => ({
          ...heading,
          href: `#${slugHeading(heading.title)}`,
          title: stripMarkdown(heading.title)
        })),
    [note.body_markdown]
  );

  const shellWidthClass = {
    comfortable: "max-w-6xl",
    wide: "max-w-[1480px]",
    full: "max-w-[1760px]"
  }[width];

  const gridClass = showSidebar
    ? {
        comfortable: "xl:grid-cols-[minmax(0,820px)_300px]",
        wide: "xl:grid-cols-[minmax(0,1fr)_320px]",
        full: "xl:grid-cols-[minmax(0,1fr)_340px]"
      }[width]
    : "grid-cols-1";

  const articleClass = !showSidebar
    ? {
        comfortable: "max-w-[860px]",
        wide: "max-w-[1100px]",
        full: "max-w-[1280px]"
      }[width]
    : "";

  const proseTextClass = {
    compact: "public-note-prose-compact",
    standard: "public-note-prose-standard",
    large: "public-note-prose-large"
  }[text];

  return (
    <main className="min-h-screen bg-[#f9f9f9] px-4 py-8 text-[#1a1c1c] lg:px-8">
      <div className={cn("mx-auto mb-4 rounded-lg border border-[#c3c6d0] bg-white p-3", shellWidthClass)}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/notes" className="text-sm font-medium text-[#0e3b69] hover:underline">
              Public Notes
            </Link>
            <p className="mt-1 text-xs text-[#5d6470]">Reader settings are saved on this device.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl label="Width" options={widthOptions} value={width} onChange={(nextWidth) => updatePreferences({ width: nextWidth })} />
            <SegmentedControl label="Text" options={textOptions} value={text} onChange={(nextText) => updatePreferences({ text: nextText })} />
            <button
              type="button"
              aria-pressed={showSidebar}
              onClick={() => updatePreferences({ showSidebar: !showSidebar })}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-[#c3c6d0] bg-[#f9f9f9] px-3 py-2 text-[13px] font-medium text-[#0e3b69] hover:bg-white"
            >
              {showSidebar ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              {showSidebar ? "Hide side panel" : "Show side panel"}
            </button>
          </div>
        </div>
      </div>

      <div className={cn("mx-auto grid gap-6", shellWidthClass, gridClass)}>
        <article className={cn("min-w-0 rounded-lg border border-[#c3c6d0] bg-white p-6 md:p-8 xl:p-10", articleClass)}>
          <div className="flex flex-wrap gap-2">
            <Badge tone="blue">{note.topic}</Badge>
            <Badge>{note.note_type}</Badge>
            <DifficultyBadge value={note.difficulty} noteType={note.note_type} />
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight">
            <InlineMarkdown text={note.title} />
          </h1>
          {note.description ? (
            <InlineMarkdown text={note.description} className="mt-4 block max-w-5xl text-lg leading-8 text-[#43474f]" />
          ) : null}
          <div className="mt-8">
            <MarkdownPreview markdown={note.body_markdown} className={cn("public-note-prose", proseTextClass)} />
          </div>
        </article>

        {showSidebar ? (
          <aside className="grid min-w-0 content-start gap-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
            {headings.length ? (
              <section className="rounded-lg border border-[#c3c6d0] bg-white p-5">
                <h2 className="text-lg font-semibold">On this note</h2>
                <nav className="mt-3 grid gap-1 text-sm" aria-label="Note sections">
                  {headings.map((heading) => (
                    <a
                      key={`${heading.href}-${heading.startLine}`}
                      href={heading.href}
                      className={cn(
                        "rounded px-2 py-1 text-[#0e3b69] hover:bg-[#eef4ff]",
                        heading.level === 3 && "ml-3 text-[#43474f]"
                      )}
                    >
                      {heading.title}
                    </a>
                  ))}
                </nav>
              </section>
            ) : null}

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-5">
              <h2 className="text-lg font-semibold">Suggest an improvement</h2>
              <p className="mt-2 text-sm leading-6 text-[#43474f]">
                Corrections and additions go to the owner review queue before publication.
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  href={`/contribute/note/${note.id}`}
                  className="inline-flex min-h-9 items-center justify-center rounded border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-white"
                >
                  Suggest Correction
                </Link>
                <Link
                  href="/contribute/new"
                  className="inline-flex min-h-9 items-center justify-center rounded border border-[#c3c6d0] bg-[#f9f9f9] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-[#0e3b69]"
                >
                  Propose New Note
                </Link>
              </div>
            </section>

            {diagrams.length ? (
              <section className="rounded-lg border border-[#c3c6d0] bg-white p-5">
                <h2 className="text-lg font-semibold">Diagrams</h2>
                <div className="mt-4 grid gap-3">
                  {diagrams.map((diagram) => (
                    <figure key={diagram.path} className="rounded border border-[#c3c6d0] bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={diagram.signedUrl} alt="Geometry diagram" className="h-44 w-full object-contain" />
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
