"use client";

import { Bold, Heading2, Image, Italic, LinkIcon, List, ListOrdered, Sigma } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EditorToolbarProps {
  onInsert: (before: string, after?: string) => void;
  className?: string;
}

const tools = [
  { label: "Heading", icon: Heading2, before: "\n## ", after: "" },
  { label: "Bold", icon: Bold, before: "**", after: "**" },
  { label: "Italic", icon: Italic, before: "_", after: "_" },
  { label: "Bullet list", icon: List, before: "\n- ", after: "" },
  { label: "Numbered list", icon: ListOrdered, before: "\n1. ", after: "" },
  { label: "Link", icon: LinkIcon, before: "[", after: "](https://)" },
  { label: "Image", icon: Image, before: "![diagram](", after: ")" },
  { label: "LaTeX block", icon: Sigma, before: "\n$$\n", after: "\n$$\n" }
];

const latexCommands = [
  { label: "Inline math: $...$", before: "$", after: "$" },
  { label: "Block math: $$...$$", before: "\n$$\n", after: "\n$$\n" },
  { label: "Fraction: \\frac{a}{b}", before: "\\frac{", after: "}{}" },
  { label: "Power: x^{2}", before: "^{", after: "}" },
  { label: "Subscript: x_{n}", before: "_{", after: "}" },
  { label: "Square root: \\sqrt{x}", before: "\\sqrt{", after: "}" },
  { label: "Aligned block", before: "\n$$\n\\begin{aligned}\n", after: "\n\\end{aligned}\n$$\n" },
  { label: "Congruence: \\equiv \\pmod n", before: "\\equiv ", after: " \\pmod{}" },
  { label: "GCD: \\gcd(a,b)", before: "\\gcd(", after: "," },
  { label: "Totient: \\varphi(n)", before: "\\varphi(", after: ")" },
  { label: "Binomial: \\binom{n}{k}", before: "\\binom{", after: "}{}" },
  { label: "Sum: \\sum_{i=1}^{n}", before: "\\sum_{", after: "}^{ }" },
  { label: "Product: \\prod_{i=1}^{n}", before: "\\prod_{", after: "}^{ }" },
  { label: "Set: \\mathbb{Z}", before: "\\mathbb{", after: "}" },
  { label: "Angle: \\angle ABC", before: "\\angle ", after: "" },
  { label: "Triangle: \\triangle ABC", before: "\\triangle ", after: "" },
  { label: "Parallel: \\parallel", before: "\\parallel ", after: "" },
  { label: "Perpendicular: \\perp", before: "\\perp ", after: "" }
];

export function EditorToolbar({ onInsert, className }: EditorToolbarProps) {
  return (
    <div
      className={cn(
        "flex min-h-10 items-center gap-1 overflow-x-auto border border-[#c3c6d0] bg-[#f9f9f9] px-2 py-1",
        className
      )}
      aria-label="Markdown formatting toolbar"
    >
      {tools.map((tool, index) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.label}
            type="button"
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded text-[#43474f] hover:bg-white hover:text-[#0e3b69]",
              index === 3 && "ml-2 border-l border-[#c3c6d0] pl-2"
            )}
            aria-label={tool.label}
            title={tool.label}
            onClick={() => onInsert(tool.before, tool.after)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
      <select
        aria-label="LaTeX commands"
        title="LaTeX commands"
        className="ml-2 h-8 shrink-0 rounded border border-[#c3c6d0] bg-white px-2 text-[12px] font-medium text-[#0e3b69] outline-none focus:ring-2 focus:ring-[#a5c8ff]"
        value=""
        onChange={(event) => {
          if (event.target.value === "") return;
          const command = latexCommands[Number(event.target.value)];
          if (command?.before || command?.after) onInsert(command.before, command.after);
          event.currentTarget.value = "";
        }}
      >
        <option value="">LaTeX commands</option>
        {latexCommands.map((command, index) => (
          <option key={command.label} value={index}>
            {command.label}
          </option>
        ))}
      </select>
    </div>
  );
}
