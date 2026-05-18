"use client";

import Link from "next/link";
import { calculateMastery } from "@/lib/mastery/calculateMastery";
import type { MistakeLog, Note, NoteReview, ProblemLog } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface MasteryClientProps {
  notes: Note[];
  reviews: NoteReview[];
  problems: ProblemLog[];
  mistakes: MistakeLog[];
}

function tone(score: number) {
  if (score <= 25) return "bg-[#ffe3df] text-[#8f1d15]";
  if (score <= 50) return "bg-[#fff1cc] text-[#6d4b00]";
  if (score <= 75) return "bg-[#e7f0ff] text-[#0e3b69]";
  return "bg-[#dff5e7] text-[#155e2d]";
}

export function MasteryClient({ notes, reviews, problems, mistakes }: MasteryClientProps) {
  const rows = calculateMastery({ notes, reviews, problems, mistakes });
  const weakest = [...rows].filter((row) => row.label !== "Unknown").sort((a, b) => a.score - b.score)[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-10">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">Study signal</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Mastery Heatmap</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">
          A compact view of strengths and weaknesses from reviews, failed problems, and unresolved mistakes.
        </p>
      </div>

      {weakest ? (
        <section className="mt-6 rounded-lg border border-[#c3c6d0] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#1a1c1c]">Recommended action</h2>
          <p className="mt-2 text-sm leading-6 text-[#43474f]">
            Start with <strong>{weakest.topic}</strong>: review weak notes, add recognition triggers, then attempt one targeted problem.
          </p>
          <Link href={`/app/notes?topic=${encodeURIComponent(weakest.topic)}`} className="mt-3 inline-block text-sm font-semibold text-[#0e3b69]">
            Open related notes
          </Link>
        </section>
      ) : null}

      <section className="mt-6 overflow-x-auto rounded-lg border border-[#c3c6d0] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f9f9f9] text-[12px] uppercase tracking-[0.08em] text-[#43474f]">
            <tr>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Mastered</th>
              <th className="px-4 py-3">Needs Practice</th>
              <th className="px-4 py-3">Failed Problems</th>
              <th className="px-4 py-3">Mistakes</th>
              <th className="px-4 py-3">Avg Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.topic} className="border-t border-[#e4e6ec]">
                <td className="px-4 py-3 font-semibold text-[#1a1c1c]">{row.topic}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex min-w-24 justify-center rounded px-2 py-1 text-xs font-semibold", tone(row.score))}>
                    {row.label} · {row.score}
                  </span>
                </td>
                <td className="px-4 py-3">{row.totalNotes}</td>
                <td className="px-4 py-3">{row.masteredNotes}</td>
                <td className="px-4 py-3">{row.needsPracticeNotes + row.learningNotes}</td>
                <td className="px-4 py-3">{row.failedProblems + row.reviewLaterProblems}</td>
                <td className="px-4 py-3">{row.mistakeCount}</td>
                <td className="px-4 py-3">{row.averageConfidence ? row.averageConfidence.toFixed(1) : "n/a"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
