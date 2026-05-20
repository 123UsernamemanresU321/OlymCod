"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { buildNoteTemplate } from "@/lib/constants/note-formats";

type MarkdownSection = {
  id: string;
  level: number;
  title: string;
  body: string;
};

interface SectionEditorProps {
  markdown: string;
  noteType: string;
  title: string;
  onChange: (markdown: string) => void;
}

function parseSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;
  let preface: string[] = [];

  function pushCurrent() {
    if (current) sections.push({ ...current, body: current.body.trimEnd() });
  }

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (match) {
      pushCurrent();
      current = {
        id: `${sections.length}-${match[2]}`,
        level: match[1].length,
        title: match[2],
        body: ""
      };
      continue;
    }

    if (current) current.body += `${line}\n`;
    else preface.push(line);
  }

  pushCurrent();

  const prefaceText = preface.join("\n").trim();
  if (prefaceText) {
    sections.unshift({ id: "preface", level: 2, title: "Preface", body: prefaceText });
  }

  return sections;
}

function serializeSections(sections: MarkdownSection[]) {
  return sections
    .map((section) => `${"#".repeat(Math.max(1, Math.min(6, section.level)))} ${section.title.trim() || "Untitled"}\n\n${section.body.trim()}`)
    .join("\n\n")
    .trimEnd();
}

function templateSectionTitles(noteType: string, title: string) {
  return parseSections(buildNoteTemplate(noteType, title || "[Title]"))
    .filter((section) => section.level > 1)
    .map((section) => section.title);
}

export function SectionEditor({ markdown, noteType, title, onChange }: SectionEditorProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const sections = useMemo(() => parseSections(markdown), [markdown]);
  const templates = useMemo(() => templateSectionTitles(noteType, title), [noteType, title]);

  function updateSections(nextSections: MarkdownSection[]) {
    onChange(serializeSections(nextSections));
  }

  function updateSection(index: number, update: Partial<MarkdownSection>) {
    updateSections(sections.map((section, sectionIndex) => (sectionIndex === index ? { ...section, ...update } : section)));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    updateSections(next);
  }

  function deleteSection(index: number) {
    if (!window.confirm(`Delete section "${sections[index].title}"?`)) return;
    updateSections(sections.filter((_, sectionIndex) => sectionIndex !== index));
  }

  function addSection(titleToAdd: string) {
    if (!titleToAdd) return;
    updateSections([...sections, { id: `${Date.now()}-${titleToAdd}`, level: 2, title: titleToAdd, body: "" }]);
  }

  return (
    <div className="grid gap-3 rounded-lg border border-[#c3c6d0] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1a1c1c]">Section Editor</p>
          <p className="text-xs leading-5 text-[#43474f]">This edits headings and sections, then saves back to plain Markdown.</p>
        </div>
        <select
          className={inputClassName("w-auto min-w-48")}
          value=""
          onChange={(event) => {
            addSection(event.target.value);
            event.currentTarget.value = "";
          }}
        >
          <option value="">Add section from template</option>
          {templates.map((templateTitle) => (
            <option key={templateTitle} value={templateTitle}>
              {templateTitle}
            </option>
          ))}
        </select>
      </div>

      {sections.length ? (
        sections.map((section, index) => {
          const isCollapsed = collapsed.has(section.id);
          return (
            <section key={section.id} className="rounded border border-[#d5d7de] bg-[#f9f9f9]">
              <div className="flex flex-wrap items-center gap-2 border-b border-[#d5d7de] p-2">
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded hover:bg-white"
                  onClick={() => {
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    });
                  }}
                  aria-label={isCollapsed ? "Expand section" : "Collapse section"}
                >
                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
                <input
                  className={inputClassName("min-w-0 flex-1 bg-white")}
                  value={section.title}
                  onChange={(event) => updateSection(index, { title: event.target.value })}
                />
                <Button type="button" variant="secondary" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                  Move up
                </Button>
                <Button type="button" variant="secondary" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1}>
                  Move down
                </Button>
                <button type="button" className="grid h-9 w-9 place-items-center text-[#8f1d15]" onClick={() => deleteSection(index)} aria-label="Delete section">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {!isCollapsed ? (
                <textarea
                  className="min-h-36 w-full resize-y bg-white p-3 font-mono text-sm leading-7 outline-none"
                  value={section.body}
                  onChange={(event) => updateSection(index, { body: event.target.value })}
                  placeholder="Section Markdown..."
                />
              ) : null}
            </section>
          );
        })
      ) : (
        <div className="rounded border border-dashed border-[#c3c6d0] p-4 text-sm text-[#43474f]">
          No headings found. Use Raw Markdown or add a section.
        </div>
      )}
      <Button type="button" variant="secondary" onClick={() => addSection("New Section")}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add blank section
      </Button>
    </div>
  );
}
