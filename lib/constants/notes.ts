import type {
  NoteDraft,
  NoteType,
  SuggestionStatus,
  SuggestionType,
  Topic,
  UserRole
} from "@/lib/types";
import { buildNoteTemplate } from "@/lib/constants/note-formats";

export const TOPICS: Topic[] = [
  "Number Theory",
  "Combinatorics",
  "Algebra",
  "Geometry",
  "Inequalities",
  "Formula Bank",
  "Problem Patterns",
  "Inbox"
];

export const NOTE_TYPES: NoteType[] = [
  "Theorem",
  "Lemma",
  "Technique",
  "Formula",
  "Formula Log",
  "Trick",
  "Common Mistake",
  "Problem Pattern",
  "Past Problem",
  "Definition",
  "Example",
  "Inbox"
];

export const USER_ROLES: UserRole[] = [
  "owner",
  "trusted_contributor",
  "contributor",
  "viewer",
  "banned"
];

export const SUGGESTION_TYPES: SuggestionType[] = [
  "typo",
  "correction",
  "addition",
  "new_note",
  "diagram",
  "formula",
  "explanation",
  "example",
  "related_technique",
  "common_mistake",
  "other"
];

export const SUGGESTION_STATUSES: SuggestionStatus[] = [
  "pending",
  "approved",
  "rejected",
  "needs_changes",
  "merged",
  "spam"
];

export const OWNER_EMAIL = "erichuang.shangjing@outlook.com";

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Basic",
  2: "BMO1 / AMO lower",
  3: "AMO / BMO2 lower",
  4: "BMO2 / PAMO lower",
  5: "PAMO / IMO 1/4",
  6: "IMO 1/4 strong",
  7: "IMO 2/5 lower",
  8: "IMO 2/5 strong",
  9: "IMO 3/6 lower",
  10: "IMO 3/6 strong",
  11: "Very hard shortlist",
  12: "Extreme"
};

export const DEFAULT_NOTE_TEMPLATE = buildNoteTemplate("Theorem", "[Title]");

export const STARTER_NOTES: Array<NoteDraft & { seed_slug: string }> = [
  {
    seed_slug: "euler-phi-theorem",
    title: "Euler Phi Theorem",
    slug: "euler-phi-theorem",
    topic: "Number Theory",
    note_type: "Theorem",
    difficulty: 4,
    description:
      "A fundamental result connecting coprime residues, Euler's totient function, and modular exponents.",
    tags: ["modular arithmetic", "phi", "coprime", "exponents"],
    body_markdown: `# Euler Phi Theorem

## Statement

If $\\gcd(a,n)=1$, then

$$a^{\\varphi(n)} \\equiv 1 \\pmod n.$$

## When to use it

Use this when a modular exponent has a base coprime to the modulus and the modulus is composite or not explicitly prime.

## Intuition

Multiplication by $a$ permutes the reduced residue classes modulo $n$.

## Mini example

Since $\\varphi(10)=4$ and $\\gcd(3,10)=1$, we have $3^4 \\equiv 1 \\pmod {10}$.
`,
    diagram_urls: [],
    visibility: "private",
    is_favorite: true
  },
  {
    seed_slug: "fermats-little-theorem",
    title: "Fermat's Little Theorem",
    slug: "fermats-little-theorem",
    topic: "Number Theory",
    note_type: "Theorem",
    difficulty: 3,
    description: "The prime-modulus special case for reducing modular exponents.",
    tags: ["primes", "modular arithmetic", "exponents"],
    body_markdown: `# Fermat's Little Theorem

## Statement

If $p$ is prime and $p \\nmid a$, then

$$a^{p-1} \\equiv 1 \\pmod p.$$

## When to use it

Use this for exponent reductions modulo a prime.
`,
    diagram_urls: [],
    visibility: "private",
    is_favorite: false
  },
  {
    seed_slug: "pigeonhole-principle",
    title: "Pigeonhole Principle",
    slug: "pigeonhole-principle",
    topic: "Combinatorics",
    note_type: "Technique",
    difficulty: 2,
    description: "A counting technique that forces repetition or existence.",
    tags: ["counting", "contradiction", "existence"],
    body_markdown: `# Pigeonhole Principle

## Statement

If more than $m$ objects are placed into $m$ boxes, at least one box contains at least two objects.

## When to use it

Use this when a problem asks you to prove that two things must coincide, repeat, or share a property.
`,
    diagram_urls: [],
    visibility: "private",
    is_favorite: false
  },
  {
    seed_slug: "invariants",
    title: "Invariants",
    slug: "invariants",
    topic: "Combinatorics",
    note_type: "Technique",
    difficulty: 4,
    description: "A technique for tracking quantities that remain unchanged under operations.",
    tags: ["parity", "operations", "invariant"],
    body_markdown: `# Invariants

## Statement

Find a quantity or property that does not change after each allowed operation.

## When to use it

Use this in operation games, coloring problems, parity problems, and impossible-state proofs.
`,
    diagram_urls: [],
    visibility: "private",
    is_favorite: false
  },
  {
    seed_slug: "am-gm",
    title: "AM-GM",
    slug: "am-gm",
    topic: "Inequalities",
    note_type: "Theorem",
    difficulty: 3,
    description: "The arithmetic mean is at least the geometric mean for nonnegative variables.",
    tags: ["inequality", "averages", "positive variables"],
    body_markdown: `# AM-GM

## Statement

For nonnegative real numbers $x_1,\\dots,x_n$,

$$\\frac{x_1+\\cdots+x_n}{n} \\ge \\sqrt[n]{x_1x_2\\cdots x_n}.$$

Equality holds when all variables are equal.
`,
    diagram_urls: [],
    visibility: "private",
    is_favorite: false
  },
  {
    seed_slug: "power-of-a-point",
    title: "Power of a Point",
    slug: "power-of-a-point",
    topic: "Geometry",
    note_type: "Theorem",
    difficulty: 5,
    description: "Relates products of lengths from a point through a circle.",
    tags: ["circles", "lengths", "secants", "tangents"],
    body_markdown: `# Power of a Point

## Statement

For a point $P$ and a circle, if a secant through $P$ meets the circle at $A$ and $B$, the product $PA \\cdot PB$ is constant over all such secants.

## Mini example

For two secants $PAB$ and $PCD$,

$$PA \\cdot PB = PC \\cdot PD.$$
`,
    diagram_urls: [],
    visibility: "private",
    is_favorite: true
  }
];
