import type { NotebookSectionKey } from "@/lib/notebook/types";

// Recognized examples: Statement, Core idea, When to use it, Common mistakes.
const HEADING_ALIASES: Record<string, NotebookSectionKey> = {
  statement: "statement",
  claim: "statement",
  definition: "statement",
  "problem statement": "statement",
  problem: "statement",
  "example problem": "statement",
  formula: "formula",
  formulae: "formula",
  formulas: "formula",
  identities: "formula",
  identity: "formula",
  "formula list": "formula",
  "formulae list": "formula",
  "formula bank": "formula",
  "important formulae": "formula",
  "important formulas": "formula",
  "important identities": "formula",
  "core idea": "core_idea",
  idea: "core_idea",
  "key relation": "key_relation",
  configuration: "configuration",
  setup: "configuration",
  "when to use it": "when_to_use",
  "when to use": "when_to_use",
  "use case": "when_to_use",
  "signs this technique may work": "signs",
  trigger: "signs",
  intuition: "intuition",
  proof: "proof",
  "proof sketch": "proof",
  derivation: "derivation",
  "mini example": "example",
  example: "example",
  examples: "example",
  "quick example": "example",
  "common mistakes": "common_mistakes",
  "mistakes to avoid": "common_mistakes",
  "common diagram traps": "traps",
  "related techniques": "related",
  "related formulae": "related",
  "related results": "related",
  "problems where this appears": "problems",
  conditions: "conditions",
  source: "source",
  solution: "solution",
  "solution summary": "solution",
  "key idea": "key_idea",
  mistake: "mistake",
  "correct principle": "correct_principle",
  "how to recognize it": "how_to_recognize",
  "why it happens": "why_it_happens",
  "how to avoid it": "how_to_avoid",
  diagram: "diagram"
};

function normalizeHeading(value: string) {
  return value
    .replace(/#+$/g, "")
    .replace(/[*_`[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function firstUsefulParagraph(markdown: string) {
  return markdown
    .replace(/^# .+$/m, "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find((part) => part && !part.startsWith("#") && !part.startsWith("---"));
}

export function extractNotebookSections(markdown: string) {
  const sections: Partial<Record<NotebookSectionKey, string>> = {};
  const lines = markdown.split(/\r?\n/);
  let currentKey: NotebookSectionKey | null = null;
  let currentLevel = 0;
  let current: string[] = [];
  let inFence = false;

  const preamble: string[] = [];
  let hitFirstRecognizedHeading = false;

  function flush() {
    if (!currentKey) return;
    const body = current.join("\n").trim();
    if (!body) return;
    sections[currentKey] = sections[currentKey] ? `${sections[currentKey]}\n\n${body}` : body;
  }

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      if (currentKey) {
        current.push(line);
      } else if (!hitFirstRecognizedHeading) {
        preamble.push(line);
      }
      continue;
    }

    const match = !inFence ? line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/) : null;
    if (match) {
      const level = match[1].length;
      const alias = HEADING_ALIASES[normalizeHeading(match[2])];

      if (alias) {
        hitFirstRecognizedHeading = true;
        flush();
        current = [];
        currentLevel = level;
        currentKey = alias;
        continue;
      }

      // Unrecognized heading
      if (currentKey) {
        if (level > currentLevel) {
          current.push(line);
        } else {
          flush();
          current = [];
          currentKey = null;
        }
        continue;
      }
    }

    if (currentKey) {
      current.push(line);
    } else if (!hitFirstRecognizedHeading) {
      preamble.push(line);
    }
  }

  flush();

  const finalPreamble = preamble.join("\n").trim();
  if (finalPreamble) {
    sections.statement = sections.statement ?? finalPreamble;
  }

  const first = firstUsefulParagraph(markdown);
  if (first) sections.first_paragraph = first;
  sections.full = markdown.trim();

  return sections;
}
