"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";

function counts(values: string[]) {
  return [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function TaxonomyManagerClient({ notes }: { notes: Note[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState<"tag" | "topic">("tag");
  const [message, setMessage] = useState<string | null>(null);

  const tagCounts = useMemo(() => counts(notes.flatMap((note) => note.tags)), [notes]);
  const topicCounts = useMemo(() => counts(notes.map((note) => note.topic)), [notes]);
  const affected = notes.filter((note) => mode === "tag" ? note.tags.includes(from) : note.topic === from);
  const similarTags = useMemo(() => {
    const tags = tagCounts.map(([tag]) => tag);
    return tags.flatMap((tag, index) =>
      tags.slice(index + 1).flatMap((other) => {
        const a = tag.toLowerCase();
        const b = other.toLowerCase();
        return a.includes(b) || b.includes(a) || a.replace(/\s+/g, "") === b.replace(/\s+/g, "")
          ? [`${tag} ↔ ${other}`]
          : [];
      })
    );
  }, [tagCounts]);

  async function applyRename() {
    if (!from || !to || !window.confirm(`Rename ${mode} "${from}" to "${to}" on ${affected.length} notes?`)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("You must be logged in.");
      return;
    }
    for (const note of affected) {
      const update = mode === "tag"
        ? { tags: Array.from(new Set(note.tags.map((tag) => tag === from ? to : tag))) }
        : { topic: to };
      const { error } = await supabase.from("notes").update(update).eq("id", note.id).eq("user_id", user.id);
      if (error) {
        setMessage(error.message);
        return;
      }
    }
    setMessage(`Updated ${affected.length} notes. Refresh to see counts.`);
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10">
      <main>
        <h1 className="text-3xl font-semibold text-[#1a1c1c]">Tag And Topic Management</h1>
        <p className="mt-2 text-sm leading-6 text-[#43474f]">Rename or merge messy tags and topics with a preview before applying changes.</p>
        <section className="mt-6 grid gap-4 rounded-lg border border-[#c3c6d0] bg-white p-5 md:grid-cols-4">
          <Field label="Mode">
            <select className={inputClassName()} value={mode} onChange={(event) => setMode(event.target.value as "tag" | "topic")}>
              <option value="tag">Tag</option>
              <option value="topic">Topic</option>
            </select>
          </Field>
          <Field label="Rename / merge from">
            <input className={inputClassName()} value={from} onChange={(event) => setFrom(event.target.value)} placeholder={mode === "tag" ? "modular" : "Geo"} />
          </Field>
          <Field label="To">
            <input className={inputClassName()} value={to} onChange={(event) => setTo(event.target.value)} placeholder={mode === "tag" ? "modular arithmetic" : "Geometry"} />
          </Field>
          <div className="flex items-end">
            <Button type="button" onClick={() => void applyRename()}>Previewed rename</Button>
          </div>
        </section>
        {message ? <p className="mt-3 text-sm text-[#0e3b69]">{message}</p> : null}
        <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Affected notes preview</h2>
          <div className="mt-3 grid gap-2">
            {affected.map((note) => (
              <Link key={note.id} href={`/app/notes/${note.id}`} className="rounded border border-[#d5d7de] p-3 text-sm hover:bg-[#f9f9f9]">
                <span className="font-semibold text-[#0e3b69]">{note.title}</span>
                <span className="ml-2 text-[#43474f]">{note.topic} · {note.tags.join(", ")}</span>
              </Link>
            ))}
            {!affected.length ? <p className="text-sm text-[#43474f]">Enter an existing tag or topic to preview affected notes.</p> : null}
          </div>
        </section>
      </main>
      <aside className="grid content-start gap-4">
        <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
          <h2 className="font-semibold text-[#1a1c1c]">Tags</h2>
          <div className="mt-3 grid max-h-72 gap-1 overflow-auto text-sm">
            {tagCounts.map(([tag, count]) => <button key={tag} type="button" className="flex justify-between rounded px-2 py-1 hover:bg-[#f9f9f9]" onClick={() => { setMode("tag"); setFrom(tag); }}><span>{tag}</span><span>{count}</span></button>)}
          </div>
        </section>
        <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
          <h2 className="font-semibold text-[#1a1c1c]">Topics</h2>
          <div className="mt-3 grid gap-1 text-sm">
            {topicCounts.map(([topic, count]) => <button key={topic} type="button" className="flex justify-between rounded px-2 py-1 hover:bg-[#f9f9f9]" onClick={() => { setMode("topic"); setFrom(topic); }}><span>{topic}</span><span>{count}</span></button>)}
          </div>
        </section>
        <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
          <h2 className="font-semibold text-[#1a1c1c]">Similar tags</h2>
          <div className="mt-3 grid gap-1 text-sm text-[#43474f]">
            {similarTags.slice(0, 12).map((pair) => <span key={pair}>{pair}</span>)}
            {!similarTags.length ? <span>No obvious duplicates detected.</span> : null}
          </div>
        </section>
      </aside>
    </div>
  );
}
