import type { NoteType, Topic } from "@/lib/types";

export interface NoteFormat {
  label: NoteType;
  description: string;
  defaultTopic: Topic;
  defaultDifficulty: number | null;
  usesDifficulty: boolean;
  template: (title: string) => string;
}

const titleOrPlaceholder = (title: string) => title.trim() || "[Title]";

export const NOTE_TYPE_FORMATS = {
  Theorem: {
    label: "Theorem",
    description: "A formal result with conditions, proof idea, use cases, and traps.",
    defaultTopic: "Number Theory",
    defaultDifficulty: 4,
    usesDifficulty: true,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Statement

State the theorem clearly.

## Conditions

- ...

## When to use it

Use this when:

- ...

## Intuition

Explain why the result should be true.

## Proof sketch

Outline the proof in a way you can reconstruct later.

## Mini example

Write a short example.

## Common mistakes

- ...

## Related techniques

- ...
`
  },
  Lemma: {
    label: "Lemma",
    description: "A smaller reusable result that supports larger solutions.",
    defaultTopic: "Geometry",
    defaultDifficulty: 4,
    usesDifficulty: true,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Claim

State the lemma.

## Setup

Define the objects, variables, and assumptions.

## Why it helps

Explain what this lemma unlocks.

## Proof

Give a compact proof or proof sketch.

## Example use

Show where it appears in a solution.

## Common mistakes

- ...

## Related results

- ...
`
  },
  Technique: {
    label: "Technique",
    description: "A reusable method with triggers, steps, examples, and failure modes.",
    defaultTopic: "Combinatorics",
    defaultDifficulty: 4,
    usesDifficulty: true,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Trigger

Use this when the problem contains:

- ...

## Core idea

Describe the method in one paragraph.

## How to apply it

1. ...
2. ...
3. ...

## Mini example

Write a short worked example.

## Common mistakes

- ...

## Variations

- ...

## Related techniques

- ...
`
  },
  Formula: {
    label: "Formula",
    description: "A compact formula entry with conditions, meaning, and when to use it.",
    defaultTopic: "Formula Bank",
    defaultDifficulty: null,
    usesDifficulty: false,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Formula

$$
...
$$

## Meaning of variables

- ...

## Conditions

- ...

## When to use it

Use this when:

- ...

## Quick example

Show one substitution or use.

## Related formulae

- ...
`
  },
  "Formula Log": {
    label: "Formula Log",
    description: "A lightweight formula note for quick recall, without difficulty scoring.",
    defaultTopic: "Formula Bank",
    defaultDifficulty: null,
    usesDifficulty: false,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Formula

$$
...
$$

## When to use it

- ...

## Conditions

- ...

## Quick check

Write a fast sanity check or special case.

## Related formulae

- ...
`
  },
  Trick: {
    label: "Trick",
    description: "A narrow move that is easy to miss and useful in specific situations.",
    defaultTopic: "Problem Patterns",
    defaultDifficulty: 5,
    usesDifficulty: true,
    template: (title) => `# ${titleOrPlaceholder(title)}

## The trick

Describe the move.

## Trigger

Look for:

- ...

## Why it works

Explain the underlying reason.

## Example

Show it in a small problem.

## Common mistakes

- ...

## Related tricks

- ...
`
  },
  "Common Mistake": {
    label: "Common Mistake",
    description: "A known trap with warning signs and the correct replacement idea.",
    defaultTopic: "Problem Patterns",
    defaultDifficulty: 4,
    usesDifficulty: true,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Mistake

Describe the wrong step or assumption.

## Why it is tempting

Explain why this error feels plausible.

## Warning signs

- ...

## Correct principle

State the right idea.

## Fix

Show how to repair the solution.

## Example

Write a short example where the mistake appears.
`
  },
  "Problem Pattern": {
    label: "Problem Pattern",
    description: "A family of problems with triggers, strategy, examples, and variations.",
    defaultTopic: "Problem Patterns",
    defaultDifficulty: 5,
    usesDifficulty: true,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Pattern

Describe the recurring structure.

## Trigger phrases

- ...

## Strategy

1. ...
2. ...
3. ...

## Worked example

Write a representative example.

## Common mistakes

- ...

## Variations

- ...

## Related problems

- ...
`
  },
  "Past Problem": {
    label: "Past Problem",
    description: "A contest problem writeup with source, solution, mistakes, and takeaway.",
    defaultTopic: "Problem Patterns",
    defaultDifficulty: 5,
    usesDifficulty: true,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Source

- Contest:
- Year:
- Problem:

## Problem statement

Write the problem in your own words or cite the official source.

## Topic

Main topic and secondary ideas.

## First observations

- ...

## Solution

Write the full solution or a reconstruction plan.

## Mistakes I made

- ...

## Key takeaway

What should you remember for the next similar problem?

## Related techniques

- ...
`
  },
  Definition: {
    label: "Definition",
    description: "A precise definition with notation, examples, and non-examples.",
    defaultTopic: "Algebra",
    defaultDifficulty: null,
    usesDifficulty: false,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Definition

Give the definition precisely.

## Notation

- ...

## Examples

- ...

## Non-examples

- ...

## Why it matters

Explain how this concept is used in olympiad solutions.

## Related concepts

- ...
`
  },
  Example: {
    label: "Example",
    description: "A worked example focused on solution flow and lessons learned.",
    defaultTopic: "Algebra",
    defaultDifficulty: 3,
    usesDifficulty: true,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Problem

State the example problem.

## Goal

What are we trying to show or compute?

## Solution

Write the solution step by step.

## Key move

Identify the main idea.

## Mistakes to avoid

- ...

## Generalization

What broader technique does this illustrate?
`
  },
  Inbox: {
    label: "Inbox",
    description: "A rough capture note before it becomes a full official note.",
    defaultTopic: "Inbox",
    defaultDifficulty: null,
    usesDifficulty: false,
    template: (title) => `# ${titleOrPlaceholder(title)}

## Raw idea

Write the rough thought here.

## Next action

- Expand into a full note
- Archive if not useful
`
  }
} satisfies Record<NoteType, NoteFormat>;

export function getNoteFormat(noteType: string | null | undefined): NoteFormat {
  return NOTE_TYPE_FORMATS[noteType as NoteType] ?? NOTE_TYPE_FORMATS.Technique;
}

export function buildNoteTemplate(noteType: string | null | undefined, title: string): string {
  return getNoteFormat(noteType).template(title);
}

export function noteTypeUsesDifficulty(noteType: string | null | undefined): boolean {
  return getNoteFormat(noteType).usesDifficulty;
}
