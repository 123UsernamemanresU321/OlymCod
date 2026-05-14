import { cn } from "@/lib/utils/cn";
import { DIFFICULTY_LABELS } from "@/lib/constants/notes";
import { noteTypeUsesDifficulty } from "@/lib/constants/note-formats";

interface BadgeProps {
  children: React.ReactNode;
  tone?: "default" | "blue" | "green" | "red";
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
        className
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ value, noteType }: { value: number | null; noteType?: string | null }) {
  if (noteType && !noteTypeUsesDifficulty(noteType)) return null;
  if (!value) return <Badge>Difficulty unset</Badge>;

  return (
    <Badge tone={value >= 9 ? "red" : value >= 5 ? "blue" : "green"}>
      {value}. {DIFFICULTY_LABELS[value]}
    </Badge>
  );
}
