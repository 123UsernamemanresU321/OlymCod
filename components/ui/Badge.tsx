import { cn } from "@/lib/utils/cn";
import { CONCEPT_LEVEL_LABELS, PROBLEM_DIFFICULTY_LABELS } from "@/lib/constants/notes";
import { noteTypeDifficultyMeta, noteTypeUsesDifficulty } from "@/lib/constants/note-formats";

interface BadgeProps {
  children: React.ReactNode;
  tone?: "default" | "blue" | "green" | "red" | "amber";
  className?: string;
}

export function Badge({ children, tone = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-1 text-[12px] font-medium leading-none tracking-[0.03em]",
        tone === "default" && "border-[#d5d7de] bg-[#e2e2e2] text-[#43474f]",
        tone === "blue" && "border-[#8eb6ee] bg-[#dbeafe] text-[#0e3b69]",
        tone === "green" && "border-[#82c79d] bg-[#dff4e7] text-[#1d5a35]",
        tone === "red" && "border-[#ffb4ab] bg-[#ffdad6] text-[#8f1d15]",
        tone === "amber" && "border-[#f4c26b] bg-[#fff8e6] text-[#6b4a00]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({
  value,
  noteType,
  kind = "concept"
}: {
  value: number | null;
  noteType?: string | null;
  kind?: "concept" | "problem";
}) {
  if (noteType && !noteTypeUsesDifficulty(noteType)) return null;
  const meta = noteType ? noteTypeDifficultyMeta(noteType) : { label: kind === "problem" ? "Problem Difficulty" : "Concept Level", kind };
  const resolvedKind = kind === "problem" || meta.kind === "problem" ? "problem" : "concept";
  if (!value) return <Badge>{meta.label} unset</Badge>;

  const labels = resolvedKind === "problem" ? PROBLEM_DIFFICULTY_LABELS : CONCEPT_LEVEL_LABELS;

  return (
    <Badge tone={value >= 9 ? "red" : value >= 5 ? "blue" : "green"}>
      {meta.label} {value}. {labels[value]}
    </Badge>
  );
}
