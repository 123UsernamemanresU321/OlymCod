import { topicIncludes } from "@/lib/constants/notes";
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
  "topic" | "note_type" | "difficulty" | "tags" | "body_markdown" | "diagram_urls" | "recognition_triggers" | "false_uses"
>;

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

function any(items: string[] | null | undefined) {
  return Boolean(items?.some((item) => item.trim()));
}

function relatedNotesMentioned(body: string) {
  return hasHeading(body, ["Related techniques", "Related formulae", "Related results", "Related concepts", "Linked notes"]);
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

export function getCriteriaForNoteType(source: QualitySource): NoteQualityResult {
  const body = source.body_markdown ?? "";
  const type = source.note_type;
  const isGeometry = topicIncludes(source.topic, "Geometry") || type === "Geometry";
  const recognitionSource = recognitionCovered(source);
  const mistakesSource = commonMistakesCovered(source);
  const hasRelated = relatedNotesMentioned(body);
  const hasDiagram = Boolean(source.diagram_urls?.length) || hasHeading(body, ["Diagram"]);
  const hasTags = Boolean(source.tags?.length);
  const hasConceptLevel = source.difficulty !== null || type === "Formula" || type === "Formula Log" || type === "Definition" || type === "Inbox";

  const common = [
    criterion("tags", "Tags", "Searchable tags are present.", "recommended", hasTags, hasTags ? "Tags metadata is filled." : "No tags yet."),
    criterion(
      "concept-level",
      "Concept Level",
      "The note has a concept-complexity level when this format uses one.",
      "recommended",
      hasConceptLevel,
      hasConceptLevel ? "Concept level is set or not required for this note type." : "Concept level is missing."
    )
  ];

  let criteria: NoteQualityCriterion[];

  if (type === "Inbox") {
    criteria = [
      criterion("raw-idea", "Has raw idea", "Rough notes should at least preserve the idea.", "required", hasBodyText(body), hasBodyText(body) ? "Raw idea is present." : "No rough idea yet."),
      criterion("topic-guess", "Has topic guess", "A rough topic makes conversion easier.", "recommended", Boolean(source.topic), source.topic ? "Topic is set." : "No topic guess yet."),
      criterion("ready-to-convert", "Ready to convert?", "Enough content exists to turn this into a full note.", "optional", body.length > 80, body.length > 80 ? "Enough text to convert." : "Add more detail before converting.")
    ];
  } else if (isGeometry) {
    criteria = [
      criterion("configuration", "Configuration", "Defines the geometry setup.", "required", hasHeading(body, ["Configuration", "Setup"]), "Looks for Configuration or Setup."),
      criterion("diagram", "Diagram", "A diagram or uploaded diagram is attached.", "required", hasDiagram, hasDiagram ? "Diagram section or uploaded diagram exists." : "No diagram found."),
      criterion("key-relation", "Key relation", "States the main angle, length, or ratio relation.", "required", hasHeading(body, ["Key relation", "Statement", "Formula"]), "Looks for Key relation, Statement, or Formula."),
      criterion("recognition", "How to recognize it", "Recognition cues are present.", "required", Boolean(recognitionSource), recognitionSource || "No recognition cues found."),
      criterion("traps", "Common diagram traps", "Misuse/trap information is present.", "required", Boolean(mistakesSource), mistakesSource || "No traps or false uses found."),
      criterion("related", "Related Notes", "Links or related techniques are named.", "required", hasRelated, hasRelated ? "Related section exists." : "No related section found."),
      criterion("proof", "Proof", "A proof or proof sketch is present.", "recommended", hasHeading(body, ["Proof", "Proof sketch"]), "Looks for Proof or Proof sketch."),
      criterion("patterns", "Angle/length patterns", "Useful geometry patterns are recorded.", "recommended", hasHeading(body, ["Angle patterns", "Length patterns", "Angle/length patterns"]), "Looks for angle/length pattern sections."),
      criterion("problems", "Problems where this appears", "Problem applications are recorded.", "recommended", hasHeading(body, ["Problems where this appears", "Related problems"]), "Looks for problem application sections.")
    ];
  } else if (type === "Theorem" || type === "Lemma") {
    criteria = [
      criterion("statement", "Statement", "The result is stated clearly.", "required", hasHeading(body, ["Statement", "Claim"]), "Looks for Statement or Claim."),
      criterion("conditions", "Conditions", "Important assumptions and hypotheses are listed.", "required", hasHeading(body, ["Conditions", "Setup"]), "Looks for Conditions or Setup."),
      criterion("recognition", "When to use it", "Use cases or recognition triggers are present.", "required", Boolean(recognitionSource), recognitionSource || "No when-to-use or trigger metadata found."),
      criterion("proof", "Proof / Proof Sketch", "A proof or reconstructable proof sketch is present.", "required", hasHeading(body, ["Proof", "Proof sketch"]), "Looks for Proof or Proof sketch."),
      criterion("example", "Example", "A concrete example is present.", "required", hasHeading(body, ["Example", "Mini example", "Worked example", "Quick example"]), "Looks for example headings."),
      criterion("mistakes", "Common Mistakes", "False uses or common mistakes are present.", "required", Boolean(mistakesSource), mistakesSource || "No mistakes or false uses found."),
      criterion("related", "Related Notes", "Related techniques or results are recorded.", "required", hasRelated, hasRelated ? "Related section exists." : "No related section found."),
      criterion("intuition", "Intuition", "The note explains why the result should be true.", "recommended", hasHeading(body, ["Intuition", "Why it works", "Why it helps"]), "Looks for intuition headings."),
      criterion("problems", "Problems where this appears", "Applications in problems are recorded.", "recommended", hasHeading(body, ["Problems where this appears", "Related problems"]), "Looks for problem application sections."),
      criterion("special-cases", "Special cases", "Equality/special cases are noted if relevant.", "optional", hasHeading(body, ["Special cases", "Equality cases", "Equality condition"]), "Looks for special/equality cases.")
    ];
  } else if (type === "Formula" || type === "Formula Log") {
    criteria = [
      criterion("formula", "Formula", "The formula is written clearly.", "required", hasHeading(body, ["Formula"]), "Looks for Formula."),
      criterion("conditions", "Conditions", "Conditions for use are listed.", "required", hasHeading(body, ["Conditions"]), "Looks for Conditions."),
      criterion("variables", "Variables defined", "Variables and notation are explained.", "required", hasHeading(body, ["Meaning of variables", "Variables", "Notation"]), "Looks for variables/notation section."),
      criterion("when-to-use", "When to use it", "Use case is present.", "required", Boolean(recognitionSource), recognitionSource || "No use case or trigger metadata found."),
      criterion("example", "Example", "A quick example or check is present.", "required", hasHeading(body, ["Example", "Quick example", "Quick check"]), "Looks for example/check headings."),
      criterion("false-uses", "Common False Uses", "Important traps are recorded if relevant.", "recommended", Boolean(mistakesSource), mistakesSource || "No false uses or traps found."),
      criterion("derivation", "Derivation", "A derivation is present.", "recommended", hasHeading(body, ["Derivation", "Proof"]), "Looks for Derivation or Proof."),
      criterion("related", "Related formulae", "Related formulas are named.", "recommended", hasRelated, hasRelated ? "Related section exists." : "No related formulae found."),
      criterion("special-cases", "Special cases", "Useful special cases are recorded.", "recommended", hasHeading(body, ["Special cases"]), "Looks for Special cases.")
    ];
  } else if (type === "Definition") {
    criteria = [
      criterion("definition", "Definition", "The definition is precise.", "required", hasHeading(body, ["Definition"]), "Looks for Definition."),
      criterion("simple-meaning", "Meaning in simple words", "A plain-language explanation exists.", "required", hasHeading(body, ["Meaning", "Why it matters", "In simple words"]), "Looks for meaning/why-it-matters section."),
      criterion("example", "Example", "Examples are present.", "required", hasHeading(body, ["Example", "Examples"]), "Looks for Example."),
      criterion("non-example", "Non-example or confusion", "Non-examples or common confusion are present.", "required", hasHeading(body, ["Non-examples", "Common confusion", "Common mistakes"]), "Looks for non-example/confusion sections."),
      criterion("related", "Related concepts", "Related concepts are named.", "recommended", hasRelated, hasRelated ? "Related section exists." : "No related concepts found."),
      criterion("where-used", "Where it is used", "Uses are described.", "recommended", hasHeading(body, ["Where it is used", "Why it matters"]), "Looks for where-used/why-it-matters.")
    ];
  } else if (type === "Problem Pattern") {
    criteria = [
      criterion("pattern", "Pattern description", "The recurring structure is described.", "required", hasHeading(body, ["Pattern", "Pattern description"]), "Looks for Pattern."),
      criterion("recognition", "Recognition Triggers", "Trigger phrases are present.", "required", Boolean(recognitionSource), recognitionSource || "No trigger metadata found."),
      criterion("setup", "Typical setup", "The usual setup is recorded.", "required", hasHeading(body, ["Typical setup", "Setup"]), "Looks for setup."),
      criterion("key-move", "Key move", "The main move is identified.", "required", hasHeading(body, ["Key move", "Strategy"]), "Looks for Key move or Strategy."),
      criterion("example-problem", "Example problem", "A representative example is present.", "required", hasHeading(body, ["Example problem", "Worked example"]), "Looks for example problem."),
      criterion("traps", "Common traps", "Traps or false uses are present.", "required", Boolean(mistakesSource), mistakesSource || "No traps or false uses found."),
      criterion("related", "Related techniques", "Related techniques are named.", "recommended", hasRelated, hasRelated ? "Related section exists." : "No related techniques found."),
      criterion("variations", "Variations", "Variations are recorded.", "recommended", hasHeading(body, ["Variations", "Variants"]), "Looks for Variations.")
    ];
  } else if (type === "Common Mistake") {
    criteria = [
      criterion("mistake", "Mistake", "The wrong step is described.", "required", hasHeading(body, ["Mistake"]), "Looks for Mistake."),
      criterion("why", "Why it happens", "The reason the mistake is tempting is explained.", "required", hasHeading(body, ["Why it happens", "Why it is tempting"]), "Looks for why-it-happens section."),
      criterion("correct", "Correct principle", "The correct principle is stated.", "required", hasHeading(body, ["Correct principle", "Fix"]), "Looks for Correct principle or Fix."),
      criterion("example", "Example", "An example is present.", "required", hasHeading(body, ["Example"]), "Looks for Example."),
      criterion("avoid", "How to avoid it", "Avoidance strategy is present.", "required", hasHeading(body, ["How to avoid it", "Warning signs"]), "Looks for avoidance/warning signs."),
      criterion("linked-notes", "Linked notes", "Related notes are named.", "recommended", hasRelated, hasRelated ? "Related section exists." : "No linked notes section found."),
      criterion("linked-problems", "Linked problems", "Related problems are named.", "recommended", hasHeading(body, ["Linked problems", "Related problems"]), "Looks for linked problems.")
    ];
  } else if (type === "Example" || type === "Past Problem") {
    criteria = [
      criterion("statement", "Problem/example statement", "The problem or example is stated.", "required", hasHeading(body, ["Problem", "Problem statement", "Example"]), "Looks for problem/example statement."),
      criterion("key-idea", "Key idea", "The main idea is identified.", "required", hasHeading(body, ["Key idea", "Key move", "First observations"]), "Looks for key idea/move."),
      criterion("solution", "Solution outline", "A solution or outline is present.", "required", hasHeading(body, ["Solution", "Solution outline"]), "Looks for Solution."),
      criterion("linked-notes", "Linked notes", "Relevant notes are named.", "required", hasRelated, hasRelated ? "Related section exists." : "No linked notes found."),
      criterion("mistake-risk", "Mistake risk", "Mistakes or risks are recorded.", "recommended", Boolean(mistakesSource), mistakesSource || "No mistakes or risks found."),
      criterion("generalization", "Generalization", "Broader idea is recorded.", "recommended", hasHeading(body, ["Generalization", "Key takeaway"]), "Looks for Generalization or Key takeaway.")
    ];
  } else {
    criteria = [
      criterion("core-idea", "Core Idea", "The main method is stated.", "required", hasHeading(body, ["Core idea", "The trick"]), "Looks for Core idea or The trick."),
      criterion("recognition", "Recognition Triggers", "Recognition triggers are present.", "required", Boolean(recognitionSource), recognitionSource || "No recognition triggers found."),
      criterion("when-to-use", "When to use it", "Use cases are present.", "required", hasHeading(body, ["When to use it", "Trigger"]), "Looks for when-to-use/trigger."),
      criterion("example", "Example Pattern", "A representative example is present.", "required", hasHeading(body, ["Example pattern", "Mini example", "Example"]), "Looks for example headings."),
      criterion("mistakes", "Common False Uses / Mistakes", "Failure cases are recorded.", "required", Boolean(mistakesSource), mistakesSource || "No mistakes or false uses found."),
      criterion("related", "Related Notes", "Related notes are named.", "required", hasRelated, hasRelated ? "Related section exists." : "No related notes found."),
      criterion("problems", "Problems where this appears", "Problem applications are recorded.", "recommended", hasHeading(body, ["Problems where this appears", "Related problems"]), "Looks for problem applications."),
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
