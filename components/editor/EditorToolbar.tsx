"use client";

import { useEffect, useState } from "react";
import { Bold, Braces, Heading2, Image, Italic, LinkIcon, List, ListOrdered, Sigma, X } from "lucide-react";
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

const snippetGroups = [
  {
    category: "Number Theory",
    snippets: [
      { label: "\\gcd(a,b)", before: "\\gcd(a,b)" },
      { label: "a \\equiv b \\pmod n", before: "a \\equiv b \\pmod n" },
      { label: "\\varphi(n)", before: "\\varphi(n)" },
      { label: "a^{-1} \\pmod n", before: "a^{-1} \\pmod n" },
      { label: "\\mathbb{Z}/n\\mathbb{Z}", before: "\\mathbb{Z}/n\\mathbb{Z}" }
    ]
  },
  {
    category: "Geometry",
    snippets: [
      { label: "\\angle ABC", before: "\\angle ABC" },
      { label: "\\triangle ABC", before: "\\triangle ABC" },
      { label: "\\parallel", before: "\\parallel" },
      { label: "\\perp", before: "\\perp" },
      { label: "[AB]", before: "[AB]" },
      { label: "\\frac{AF}{FB}", before: "\\frac{AF}{FB}" }
    ]
  },
  {
    category: "Algebra",
    snippets: [
      { label: "\\sum_{k=1}^{n}", before: "\\sum_{k=1}^{n}" },
      { label: "\\prod_{k=1}^{n}", before: "\\prod_{k=1}^{n}" },
      { label: "\\sqrt{}", before: "\\sqrt{", after: "}" },
      { label: "\\frac{}{}", before: "\\frac{", after: "}{}" },
      { label: "x_1 + x_2", before: "x_1 + x_2" }
    ]
  },
  {
    category: "Inequalities",
    snippets: [
      { label: "\\ge", before: "\\ge" },
      { label: "\\le", before: "\\le" },
      { label: "\\sum", before: "\\sum" },
      { label: "\\prod", before: "\\prod" },
      { label: "\\frac{x+y}{2} \\ge \\sqrt{xy}", before: "\\frac{x+y}{2} \\ge \\sqrt{xy}" }
    ]
  },
  {
    category: "Proof",
    snippets: [
      { label: "\\Rightarrow", before: "\\Rightarrow" },
      { label: "\\Leftarrow", before: "\\Leftarrow" },
      { label: "\\iff", before: "\\iff" },
      { label: "\\therefore", before: "\\therefore" },
      { label: "\\because", before: "\\because" },
      { label: "\\boxed{}", before: "\\boxed{", after: "}" }
    ]
  }
];

export function EditorToolbar({ onInsert, className }: EditorToolbarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={cn("border border-[#c3c6d0] bg-[#f9f9f9]", className)}>
      <div className="flex min-h-10 items-center gap-1 overflow-x-auto px-2 py-1" aria-label="Markdown formatting toolbar">
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
        <button
          type="button"
          className="ml-2 inline-flex h-8 shrink-0 items-center gap-1 rounded border border-[#c3c6d0] bg-white px-2 text-[12px] font-medium text-[#0e3b69]"
          onClick={() => setPaletteOpen((current) => !current)}
          title="Snippets (Cmd/Ctrl+M)"
        >
          <Braces className="h-4 w-4" aria-hidden="true" />
          Snippets
        </button>
        <select
          aria-label="LaTeX commands"
          title="LaTeX commands"
          className="h-8 shrink-0 rounded border border-[#c3c6d0] bg-white px-2 text-[12px] font-medium text-[#0e3b69] outline-none focus:ring-2 focus:ring-[#a5c8ff]"
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
      {paletteOpen ? (
        <div className="border-t border-[#c3c6d0] bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#1a1c1c]">Math snippet palette</p>
            <button type="button" onClick={() => setPaletteOpen(false)} aria-label="Close snippets">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {snippetGroups.map((group) => (
              <section key={group.category}>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#43474f]">{group.category}</h3>
                <div className="mt-2 grid gap-1">
                  {group.snippets.map((snippet) => (
                    <button
                      key={snippet.label}
                      type="button"
                      className="rounded border border-[#d5d7de] px-2 py-1.5 text-left font-mono text-xs text-[#0e3b69] hover:bg-[#eef4ff]"
                      onClick={() => onInsert(snippet.before, snippet.after)}
                    >
                      {snippet.label}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
