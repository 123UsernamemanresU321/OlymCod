import type {
  CaptureType,
  MistakeType,
  NoteLinkRelation,
  ProblemStatus,
  ReviewStatus,
  Topic
} from "@/lib/types";

export const CAPTURE_TYPES: CaptureType[] = [
  "Rough Note",
  "Theorem",
  "Technique",
  "Formula",
  "Mistake",
  "Problem Pattern",
  "Geometry Diagram",
  "Problem Log"
];

export const CONVERSION_TEMPLATE_TYPES = [
  "Theorem",
  "Lemma",
  "Technique",
  "Formula",
  "Geometry",
  "Mistake",
  "Problem Pattern"
] as const;

export type ConversionTemplateType = (typeof CONVERSION_TEMPLATE_TYPES)[number];

export const PROBLEM_STATUSES: ProblemStatus[] = [
  "unsolved",
  "attempted",
  "solved",
  "solved_with_hint",
  "failed",
  "review_later",
  "mastered"
];

export const MISTAKE_TYPES: MistakeType[] = [
  "Forgot condition",
  "Algebra slip",
  "False assumption",
  "Diagram trap",
  "Missed invariant",
  "Wrong modulo step",
  "Overcomplicated solution",
  "Misread problem",
  "Weak proof",
  "Other"
];

export const NOTE_LINK_RELATIONS: NoteLinkRelation[] = [
  "related",
  "prerequisite",
  "stronger version",
  "weaker version",
  "commonly confused",
  "used together",
  "example of",
  "generalization",
  "special case"
];

export function inverseNoteLinkRelation(relation: string): NoteLinkRelation {
  const inverseRelations: Record<NoteLinkRelation, NoteLinkRelation> = {
    related: "related",
    prerequisite: "used together",
    "stronger version": "weaker version",
    "weaker version": "stronger version",
    "commonly confused": "commonly confused",
    "used together": "used together",
    "example of": "special case",
    generalization: "special case",
    "special case": "generalization"
  };

  return inverseRelations[relation as NoteLinkRelation] ?? "related";
}

export const REVIEW_STATUSES: ReviewStatus[] = [
  "new",
  "learning",
  "needs_practice",
  "comfortable",
  "mastered",
  "ignored"
];

const titleOrPlaceholder = (title: string) => title.trim() || "[Title]";

export function buildConversionTemplate(
  templateType: ConversionTemplateType,
  title: string,
  rawText = ""
) {
  const heading = titleOrPlaceholder(title);
  const source = rawText.trim() ? `\n\n## Original capture\n\n${rawText.trim()}\n` : "\n";

  const templates: Record<ConversionTemplateType, string> = {
    Theorem: `# ${heading}

## Statement

## When to use it

## Intuition

## Mini example

## Common mistakes

## Related techniques

## Problems where this appears
${source}`,
    Lemma: `# ${heading}

## Claim

## Setup

## Why it helps

## Proof sketch

## Example use

## Common mistakes
${source}`,
    Technique: `# ${heading}

## Core idea

## When to use it

## Signs this technique may work

## Example pattern

## Common mistakes

## Related techniques

## Problems where this appears
${source}`,
    Formula: `# ${heading}

## Formula

$$
...
$$

## Conditions

## When to use it

## Example

## Related formulae
${source}`,
    Geometry: `# ${heading}

## Configuration

## Diagram

## Key relation

## How to recognize it

## Angle/length patterns

## Common diagram traps

## Related techniques
${source}`,
    Mistake: `# ${heading}

## Mistake

## Why it happens

## Correct principle

## Example

## How to avoid it
${source}`,
    "Problem Pattern": `# ${heading}

## Pattern

## Trigger phrases

## Strategy

## Representative problem

## Common mistakes

## Related techniques
${source}`
  };

  return templates[templateType];
}

export function templateToNoteDefaults(templateType: ConversionTemplateType): {
  note_type: string;
  topic: Topic;
  difficulty: number | null;
} {
  if (templateType === "Formula") {
    return { note_type: "Formula Log", topic: "Formula Bank", difficulty: null };
  }
  if (templateType === "Geometry") {
    return { note_type: "Lemma", topic: "Geometry", difficulty: 5 };
  }
  if (templateType === "Mistake") {
    return { note_type: "Common Mistake", topic: "Problem Patterns", difficulty: 4 };
  }
  if (templateType === "Problem Pattern") {
    return { note_type: "Problem Pattern", topic: "Problem Patterns", difficulty: 5 };
  }
  return { note_type: templateType, topic: "Number Theory", difficulty: 4 };
}

export function nextReviewDateFromRating(rating: "forgot" | "shaky" | "good" | "mastered") {
  const days = rating === "forgot" ? 1 : rating === "shaky" ? 3 : rating === "good" ? 7 : 30;
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}
