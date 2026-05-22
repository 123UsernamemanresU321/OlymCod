"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { inputClassName } from "@/components/ui/Field";
import { NOTE_LINK_RELATIONS } from "@/lib/constants/daily";
import { MATH_TOPICS, NOTE_TYPES, topicIncludes } from "@/lib/constants/notes";
import type { Note, NoteLink } from "@/lib/types";

interface NoteGraphClientProps {
  notes: Note[];
  links: NoteLink[];
}

function relationColor(relation: string) {
  if (relation === "prerequisite") return "#8f1d15";
  if (relation === "commonly confused") return "#8a5a00";
  if (relation === "generalization" || relation === "special case") return "#0e3b69";
  return "#6b7280";
}

export function NoteGraphClient({ notes, links }: NoteGraphClientProps) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [noteType, setNoteType] = useState("");
  const [relation, setRelation] = useState("");
  const [neighborhoodOnly, setNeighborhoodOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let visibleNotes = notes.filter((note) => {
      const haystack = [note.title, note.topic, note.note_type, note.description, note.tags.join(" ")].filter(Boolean).join(" ").toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (topic && !topicIncludes(note.topic, topic)) return false;
      if (noteType && note.note_type !== noteType) return false;
      return true;
    });
    if (neighborhoodOnly && q) {
      const seedIds = new Set(visibleNotes.map((note) => note.id));
      const neighborIds = new Set(seedIds);
      for (const link of links) {
        if (seedIds.has(link.source_note_id)) neighborIds.add(link.target_note_id);
        if (seedIds.has(link.target_note_id)) neighborIds.add(link.source_note_id);
      }
      visibleNotes = notes.filter((note) => neighborIds.has(note.id));
    }
    const ids = new Set(visibleNotes.map((note) => note.id));
    const seen = new Set<string>();
    const visibleLinks = links.filter((link) => {
      const key = `${link.source_note_id}:${link.target_note_id}:${link.relation_type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return ids.has(link.source_note_id) && ids.has(link.target_note_id) && (!relation || link.relation_type === relation);
    });
    return {
      notes: visibleNotes,
      links: visibleLinks
    };
  }, [links, neighborhoodOnly, noteType, notes, query, relation, topic]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const count = Math.max(filtered.notes.length, 1);
    filtered.notes.forEach((note, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      const radius = count < 5 ? 170 : 230;
      map.set(note.id, { x: 320 + Math.cos(angle) * radius, y: 300 + Math.sin(angle) * radius });
    });
    return map;
  }, [filtered.notes]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-10">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">Relationship map</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Visual Note Graph</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">See prerequisites, confused pairs, generalizations, and related techniques as a note graph.</p>
      </div>

      <section className="mt-6 grid gap-3 rounded-lg border border-[#c3c6d0] bg-white p-4 md:grid-cols-5">
        <input className={inputClassName()} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes..." />
        <select className={inputClassName()} value={topic} onChange={(event) => setTopic(event.target.value)}>
          <option value="">All topics</option>
          {MATH_TOPICS.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className={inputClassName()} value={noteType} onChange={(event) => setNoteType(event.target.value)}>
          <option value="">All types</option>
          {NOTE_TYPES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className={inputClassName()} value={relation} onChange={(event) => setRelation(event.target.value)}>
          <option value="">All relations</option>
          {NOTE_LINK_RELATIONS.map((item) => <option key={item}>{item}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded border border-[#d5d7de] px-3 py-2 text-sm text-[#43474f]">
          <input type="checkbox" checked={neighborhoodOnly} onChange={(event) => setNeighborhoodOnly(event.target.checked)} />
          Neighborhood
        </label>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-[#c3c6d0] bg-white">
        <svg viewBox="0 0 640 600" className="h-[620px] w-full bg-[#fbfbfb]" role="img" aria-label="Visual note graph">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
            </marker>
          </defs>
          {filtered.links.map((link) => {
            const source = positions.get(link.source_note_id);
            const target = positions.get(link.target_note_id);
            if (!source || !target) return null;
            return (
              <g key={link.id}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={relationColor(link.relation_type)}
                  strokeWidth="2"
                  markerEnd={link.relation_type === "prerequisite" ? "url(#arrow)" : undefined}
                  opacity="0.78"
                />
                <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 4} textAnchor="middle" className="fill-[#43474f] text-[10px]">
                  {link.relation_type}
                </text>
              </g>
            );
          })}
          {filtered.notes.map((note) => {
            const position = positions.get(note.id);
            if (!position) return null;
            return (
              <Link key={note.id} href={`/app/notes/${note.id}`}>
                <g className="cursor-pointer">
                  <circle cx={position.x} cy={position.y} r="34" fill="#dbeafe" stroke="#2c5282" strokeWidth="2" />
                  <text x={position.x} y={position.y - 2} textAnchor="middle" className="fill-[#0e3b69] text-[10px] font-semibold">
                    {note.title.slice(0, 16)}
                  </text>
                  <text x={position.x} y={position.y + 12} textAnchor="middle" className="fill-[#43474f] text-[9px]">
                    {note.note_type}
                  </text>
                </g>
              </Link>
            );
          })}
        </svg>
      </section>
    </div>
  );
}
