import { topicIncludes } from "@/lib/constants/notes";
import { noteTypeDifficultyMeta, noteTypeUsesDifficulty } from "@/lib/constants/note-formats";
import type { Note, NoteDraft } from "@/lib/types";

export type NoteQualityImportance = "required" | "recommended" | "optional";

export interface NoteQualityCriterion {
  id: string;
  label: string;
  description: string;
  importance: NoteQualityImportance;
  completed: boolean;
  source: string;
}

export interface NoteQualityResult {
  criteria: NoteQualityCriterion[];
  completionPercent: number;
  requiredCompleted: number;
  requiredTotal: number;
  recommendedCompleted: number;
  recommendedTotal: number;
}

type QualitySource = Pick<
  Note | NoteDraft,
  | "title"
  | "topic"
  | "note_type"
  | "difficulty"
  | "description"
  | "tags"
  | "body_markdown"
  | "diagram_urls"
  | "recognition_triggers"
  | "false_uses"
>;

interface NoteQualityContext {
  linkedNoteCount?: number;
  linkedProblemCount?: number;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function hasHeading(body: string, names: string[]) {
  const lines = body.split(/\r?\n/);
  const wanted = names.map(normalize);
  return lines.some((line) => {
    const match = line.match(/^#{2,6}\s+(.+?)\s*#*\s*$/);
    return Boolean(match && wanted.includes(normalize(match[1])));
  });
}

function hasBodyText(body: string) {
  return body.replace(/^#+\s+.+$/gm, "").trim().length > 0;
}

function hasDescription(source: QualitySource) {
  return Boolean(source.description?.trim());
}

function any(items: string[] | null | undefined) {
  return Boolean(items?.some((item) => item.trim()));
}

function relatedNotesMentioned(body: string) {
  return hasHeading(body, ["Related techniques", "Related formulae", "Related results", "Related concepts", "Linked notes"]);
}

function relatedNotesCovered(source: QualitySource, context: NoteQualityContext) {
  if ((context.linkedNoteCount ?? 0) > 0) {
    return `Related Notes completed through ${context.linkedNoteCount} explicit linked note${context.linkedNoteCount === 1 ? "" : "s"}.`;
  }
  return relatedNotesMentioned(source.body_markdown)
    ? "Related concepts are covered in the Markdown body."
    : "";
}

function problemsCovered(source: QualitySource, context: NoteQualityContext) {
  if ((context.linkedProblemCount ?? 0) > 0) {
    return `Problem applications completed through ${context.linkedProblemCount} linked problem${context.linkedProblemCount === 1 ? "" : "s"}.`;
  }
  return hasHeading(source.body_markdown, ["Problems where this appears", "Related problems", "Linked problems"])
    ? "Problem applications are covered in the Markdown body."
    : "";
}

function criterion(
  id: string,
  label: string,
  description: string,
  importance: NoteQualityImportance,
  completed: boolean,
  source: string
): NoteQualityCriterion {
  return { id, label, description, importance, completed, source };
}

function commonMistakesCovered(source: QualitySource) {
  if (any(source.false_uses)) return "Common mistakes covered through Common False Uses metadata.";
  return hasHeading(source.body_markdown, [
    "Common Mistakes",
    "Mistakes",
    "Mistakes to avoid",
    "Mistakes I made",
    "Common False Uses",
    "Do Not Use This When",
    "Traps",
    "Common diagram traps",
    "Failure cases"
  ])
    ? "Common mistakes covered in the Markdown body."
    : "";
}

function recognitionCovered(source: QualitySource) {
  if (any(source.recognition_triggers)) return "Recognition covered through Recognition Triggers metadata.";
  return hasHeading(source.body_markdown, [
    "When to use it",
    "Trigger",
    "Trigger phrases",
    "Signs this technique may work",
    "How to recognize it",
    "Warning signs"
  ])
    ? "Recognition covered in the Markdown body."
    : "";
}

export function getCriteriaForNoteType(source: QualitySource, context: NoteQualityContext = {}): NoteQualityResult {
  const body = source.body_markdown ?? "";
  const type = source.note_type;
  const isGeometry = topicIncludes(source.topic, "Geometry") || type === "Geometry";
  const isDefinition = type === "Definition";
  const isHighLevel = typeof source.difficulty === "number" && source.difficulty >= 6;
  const isBasicLevel = typeof source.difficulty === "number" && source.difficulty <= 2;
  const recognitionSource = recognitionCovered(source);
  const mistakesSource = commonMistakesCovered(source);
  const relatedSource = relatedNotesCovered(source, context);
  const problemSource = problemsCovered(source, context);
  const hasDiagram = Boolean(source.diagram_urls?.length) || hasHeading(body, ["Diagram"]);
  const hasTags = Boolean(source.tags?.length);
  const difficultyMeta = noteTypeDifficultyMeta(type);
  const usesDifficulty = noteTypeUsesDifficulty(type);
  const hasConceptLevel = source.difficulty !== null && source.difficulty !== undefined;
  const hasTopic = Boolean(source.topic);
  const descriptionImportance: NoteQualityImportance = type === "Inbox" ? "optional" : isDefinition ? "required" : "recommended";

  const common: NoteQualityCriterion[] = [
    criterion("topic", "Topic", "The note is filed under a topic or topic combination.", "required", hasTopic, hasTopic ? "Topic metadata is filled." : "No topic set."),
    criterion(
      "description",
      "Description",
      "A short description helps search, browsing, and AI context.",
      descriptionImportance,
      hasDescription(source),
      hasDescription(source) ? "Description metadata is filled." : "No description yet."
    ),
    criterion("tags", "Tags", "Searchable tags are present.", "recommended", hasTags, hasTags ? "Tags metadata is filled." : "No tags yet."),
  ];

  if (usesDifficulty) {
    common.push(criterion(
      "concept-level",
      difficultyMeta.label,
      "The note has the right difficulty-style rating when this format uses one.",
      isHighLevel ? "required" : "recommended",
      hasConceptLevel,
      hasConceptLevel ? `${difficultyMeta.label} metadata is set.` : `${difficultyMeta.label} is missing.`
    ));
  }

  let criteria: NoteQualityCriterion[];

  if (type === "Inbox") {
    criteria = [
      criterion("raw-idea", "Has raw idea", "Rough notes should at least preserve the idea.", "required", hasBodyText(body), hasBodyText(body) ? "Raw idea is present." : "No rough idea yet."),
      criterion("topic-guess", "Has topic guess", "A rough topic makes conversion easier.", "recommended", Boolean(source.topic), source.topic ? "Topic is set." : "No topic guess yet."),
      criterion("ready-to-convert", "Ready to convert?", "Enough content exists to turn this into a full note.", "optional", body.length > 80, body.length > 80 ? "Enough text to convert." : "Add more detail before converting.")
    ];
  } else if (isDefinition) {
    criteria = [
      criterion("definition", "Definition", "The definition is precise.", "required", hasHeading(body, ["Definition"]), "Looks for Definition."),
      criterion("simple-meaning", "Meaning in simple words", "A plain-language explanation exists.", "required", hasHeading(body, ["Meaning", "Why it matters", "In simple words"]), "Looks for meaning/why-it-matters section."),
      criterion("example", "Example", "Examples are present.", "required", hasHeading(body, ["Example", "Examples"]), "Looks for Example."),
      criterion("non-example", "Non-example or confusion", "Non-examples or common confusion are present.", "recommended", hasHeading(body, ["Non-examples", "Common confusion", "Common mistakes"]), "Looks for non-example/confusion sections."),
      criterion("related", "Related concepts", "Related concepts are linked or named.", "recommended", Boolean(relatedSource), relatedSource || "No linked notes or related concepts section found."),
      criterion("where-used", "Where it is used", "Uses are described.", "recommended", hasHeading(body, ["Where it is used", "Why it matters"]), "Looks for where-used/why-it-matters."),
      ...(isGeometry
        ? [
            criterion("diagram", "Diagram", "A diagram is useful for geometry definitions, but not mandatory.", "recommended" as const, hasDiagram, hasDiagram ? "Diagram section or uploaded diagram exists." : "No diagram found.")
          ]
        : [])
    ];
  } else if (type === "Geometry") {
    criteria = [
      criterion("configuration", "Configuration", "Defines the geometry setup.", "required", hasHeading(body, ["Configuration", "Setup"]), "Looks for Configuration or Setup."),
      criterion("diagram", "Diagram", "A diagram or uploaded diagram is attached.", "required", hasDiagram, hasDiagram ? "Diagram section or uploaded diagram exists." : "No diagram found."),
      criterion("key-relation", "Key relation", "States the main angle, length, or ratio relation.", "required", hasHeading(body, ["Key relation", "Statement", "Formula"]), "Looks for Key relation, Statement, or Formula."),
      criterion("recognition", "How to recognize it", "Recognition cues are present.", "required", Boolean(recognitionSource), recognitionSource || "No recognition cues found."),
      criterion("traps", "Common diagram traps", "Misuse/trap information is present.", "required", Boolean(mistakesSource), mistakesSource || "No traps or false uses found."),
      criterion("related", "Related Notes", "Links or related techniques are named.", "required", Boolean(relatedSource), relatedSource || "No linked notes or related section found."),
      criterion("proof", "Proof", "A proof or proof sketch is present.", "recommended", hasHeading(body, ["Proof", "Proof sketch"]), "Looks for Proof or Proof sketch."),
      criterion("patterns", "Angle/length patterns", "Useful geometry patterns are recorded.", "recommended", hasHeading(body, ["Angle patterns", "Length patterns", "Angle/length patterns"]), "Looks for angle/length pattern sections."),
      criterion("problems", "Problems where this appears", "Problem applications are recorded.", "recommended", Boolean(problemSource), problemSource || "No problem applications found.")
    ];
  } else if (type === "Theorem" || type === "Lemma") {
    criteria = [
      criterion("statement", "Statement", "The result is stated clearly.", "required", hasHeading(body, ["Statement", "Claim"]), "Looks for Statement or Claim."),
      criterion("conditions", isGeometry ? "Conditions / configuration" : "Conditions", "Important assumptions and hypotheses are listed.", "required", hasHeading(body, ["Conditions", "Setup", "Configuration"]), "Looks for Conditions, Setup, or Configuration."),
      criterion("recognition", "When to use it", "Use cases or recognition triggers are present.", "required", Boolean(recognitionSource), recognitionSource || "No when-to-use or trigger metadata found."),
      criterion("proof", "Proof / Proof Sketch", "A proof or reconstructable proof sketch is present.", isBasicLevel ? "recommended" : "required", hasHeading(body, ["Proof", "Proof sketch"]), "Looks for Proof or Proof sketch."),
      criterion("example", "Example", "A concrete example is present.", "required", hasHeading(body, ["Example", "Mini example", "Worked example", "Quick example"]), "Looks for example headings."),
      criterion("mistakes", "Common Mistakes", "False uses or common mistakes are present.", "required", Boolean(mistakesSource), mistakesSource || "No mistakes or false uses found."),
      criterion("related", "Related Notes", "Related techniques or results are linked or recorded.", "required", Boolean(relatedSource), relatedSource || "No linked notes or related section found."),
      criterion("intuition", "Intuition", "The note explains why the result should be true.", isHighLevel ? "required" : "recommended", hasHeading(body, ["Intuition", "Why it works", "Why it helps"]), "Looks for intuition headings."),
      criterion("problems", "Problems where this appears", "Applications in problems are recorded.", "recommended", Boolean(problemSource), problemSource || "No problem applications found."),
      ...(isGeometry
        ? [
            criterion("diagram", "Diagram", "A diagram helps geometry theorem notes stay readable.", "required" as const, hasDiagram, hasDiagram ? "Diagram section or uploaded diagram exists." : "No diagram found."),
            criterion("patterns", "Angle/length patterns", "Angle, length, ratio, or circle patterns are recorded when relevant.", "recommended" as const, hasHeading(body, ["Angle patterns", "Length patterns", "Angle/length patterns", "Ratio patterns", "Circle patterns"]), "Looks for geometry pattern sections.")
          ]
        : []),
      criterion("special-cases", "Special cases", "Equality/special cases are noted if relevant.", "optional", hasHeading(body, ["Special cases", "Equality cases", "Equality condition"]), "Looks for special/equality cases.")
    ];
  } else if (type === "Formula" || type === "Formula Log") {
    criteria = [
      criterion("formula", "Formula", "The formula is written clearly.", "required", hasHeading(body, ["Formula"]), "Looks for Formula."),
      criterion("conditions", "Conditions", "Conditions for use are listed.", "required", hasHeading(body, ["Conditions"]), "Looks for Conditions."),
      criterion("variables", "Variables defined", "Variables and notation are explained.", "required", hasHeading(body, ["Meaning of variables", "Variables", "Notation"]), "Looks for variables/notation section."),
      criterion("when-to-use", "When to use it", "Use case is present.", "required", Boolean(recognitionSource), recognitionSource || "No use case or trigger metadata found."),
      criterion("example", "Example", "A quick example or check is present.", "required", hasHeading(body, ["Example", "Quick example", "Quick check"]), "Looks for example/check headings."),
      criterion("derivation", "Derivation", "A derivation is present.", "recommended", hasHeading(body, ["Derivation", "Proof"]), "Looks for Derivation or Proof."),
      criterion("related", "Related formulae", "Related formulas are linked or named.", "recommended", Boolean(relatedSource), relatedSource || "No linked notes or related formulae found."),
      criterion("special-cases", "Special cases", "Useful special cases are recorded.", "recommended", hasHeading(body, ["Special cases"]), "Looks for Special cases.")
    ];
  } else if (type === "Problem Pattern") {
    criteria = [
      criterion("pattern", "Pattern description", "The recurring structure is described.", "required", hasHeading(body, ["Pattern", "Pattern description"]), "Looks for Pattern."),
      criterion("recognition", "Recognition Triggers", "Trigger phrases are present.", "required", Boolean(recognitionSource), recognitionSource || "No trigger metadata found."),
      criterion("setup", "Typical setup", "The usual setup is recorded.", "required", hasHeading(body, ["Typical setup", "Setup"]), "Looks for setup."),
      criterion("key-move", "Key move", "The main move is identified.", "required", hasHeading(body, ["Key move", "Strategy"]), "Looks for Key move or Strategy."),
      criterion("example-problem", "Example problem", "A representative example is present.", "required", hasHeading(body, ["Example problem", "Worked example"]), "Looks for example problem."),
      criterion("traps", "Common traps", "Traps or false uses are present.", "required", Boolean(mistakesSource), mistakesSource || "No traps or false uses found."),
      criterion("related", "Related techniques", "Related techniques are linked or named.", "recommended", Boolean(relatedSource), relatedSource || "No linked notes or related techniques found."),
      criterion("variations", "Variations", "Variations are recorded.", "recommended", hasHeading(body, ["Variations", "Variants"]), "Looks for Variations.")
    ];
  } else if (type === "Common Mistake") {
    criteria = [
      criterion("mistake", "Mistake", "The wrong step is described.", "required", hasHeading(body, ["Mistake"]), "Looks for Mistake."),
      criterion("why", "Why it happens", "The reason the mistake is tempting is explained.", "required", hasHeading(body, ["Why it happens", "Why it is tempting"]), "Looks for why-it-happens section."),
      criterion("correct", "Correct principle", "The correct principle is stated.", "required", hasHeading(body, ["Correct principle", "Fix"]), "Looks for Correct principle or Fix."),
      criterion("example", "Example", "An example is present.", "required", hasHeading(body, ["Example"]), "Looks for Example."),
      criterion("avoid", "How to avoid it", "Avoidance strategy is present.", "required", hasHeading(body, ["How to avoid it", "Warning signs"]), "Looks for avoidance/warning signs."),
      criterion("linked-notes", "Linked notes", "Related notes are linked or named.", "recommended", Boolean(relatedSource), relatedSource || "No linked notes found."),
      criterion("linked-problems", "Linked problems", "Related problems are linked or named.", "recommended", Boolean(problemSource), problemSource || "No linked problems found.")
    ];
  } else if (type === "Example" || type === "Past Problem") {
    criteria = [
      criterion("statement", "Problem/example statement", "The problem or example is stated.", "required", hasHeading(body, ["Problem", "Problem statement", "Example"]), "Looks for problem/example statement."),
      criterion("key-idea", "Key idea", "The main idea is identified.", "required", hasHeading(body, ["Key idea", "Key move", "First observations"]), "Looks for key idea/move."),
      criterion("solution", "Solution outline", "A solution or outline is present.", "required", hasHeading(body, ["Solution", "Solution outline"]), "Looks for Solution."),
      criterion("linked-notes", "Linked notes", "Relevant notes are linked or named.", "required", Boolean(relatedSource), relatedSource || "No linked notes found."),
      criterion("mistake-risk", "Mistake risk", "Mistakes or risks are recorded.", "recommended", hasHeading(body, ["Mistakes I made", "Mistakes to avoid", "Common mistakes"]), "Looks for mistake/risk sections in the body."),
      criterion("generalization", "Generalization", "Broader idea is recorded.", "recommended", hasHeading(body, ["Generalization", "Key takeaway"]), "Looks for Generalization or Key takeaway.")
    ];
  } else {
    criteria = [
      criterion("core-idea", "Core Idea", "The main method is stated.", "required", hasHeading(body, ["Core idea", "The trick"]), "Looks for Core idea or The trick."),
      criterion("recognition", "Recognition Triggers", "Recognition triggers are present.", "required", Boolean(recognitionSource), recognitionSource || "No recognition triggers found."),
      criterion("when-to-use", "When to use it", "Use cases are present.", "required", hasHeading(body, ["When to use it", "Trigger"]), "Looks for when-to-use/trigger."),
      criterion("example", "Example Pattern", "A representative example is present.", "required", hasHeading(body, ["Example pattern", "Mini example", "Example"]), "Looks for example headings."),
      criterion("mistakes", "Common False Uses / Mistakes", "Failure cases are recorded.", "required", Boolean(mistakesSource), mistakesSource || "No mistakes or false uses found."),
      criterion("related", "Related Notes", "Related notes are linked or named.", "required", Boolean(relatedSource), relatedSource || "No linked notes or related section found."),
      ...(isGeometry
        ? [
            criterion("diagram", "Diagram", "A diagram helps geometry technique notes stay readable.", "recommended" as const, hasDiagram, hasDiagram ? "Diagram section or uploaded diagram exists." : "No diagram found.")
          ]
        : []),
      criterion("problems", "Problems where this appears", "Problem applications are recorded.", "recommended", Boolean(problemSource), problemSource || "No problem applications found."),
      criterion("variants", "Variants", "Variants are recorded.", "recommended", hasHeading(body, ["Variants", "Variations"]), "Looks for variants."),
      criterion("failure", "Failure cases", "Failure cases are recorded.", "recommended", hasHeading(body, ["Failure cases", "Common false uses"]), "Looks for failure cases.")
    ];
  }

  const combined = [...criteria, ...common];
  const relevant = combined.filter((item) => item.importance !== "optional");
  const completed = relevant.filter((item) => item.completed).length;
  const required = combined.filter((item) => item.importance === "required");
  const recommended = combined.filter((item) => item.importance === "recommended");

  return {
    criteria: combined,
    completionPercent: relevant.length ? Math.round((completed / relevant.length) * 100) : 100,
    requiredCompleted: required.filter((item) => item.completed).length,
    requiredTotal: required.length,
    recommendedCompleted: recommended.filter((item) => item.completed).length,
    recommendedTotal: recommended.length
  };
}
