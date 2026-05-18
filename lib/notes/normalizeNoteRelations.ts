import type { Note, NoteLink } from "@/lib/types";

export type NoteRelationDisplayGroup =
  | "Prerequisites"
  | "Used By"
  | "Generalizations"
  | "Special Cases"
  | "Stronger Versions"
  | "Weaker Versions"
  | "Commonly Confused"
  | "Used Together"
  | "Examples"
  | "Related Notes";

export interface NormalizedNoteRelation {
  group: NoteRelationDisplayGroup;
  note: Note;
  relation: string;
  direction: "outgoing" | "incoming";
  priority: number;
}

export interface NoteRelationGroup {
  label: NoteRelationDisplayGroup;
  items: NormalizedNoteRelation[];
}

const GROUP_ORDER: NoteRelationDisplayGroup[] = [
  "Prerequisites",
  "Used By",
  "Generalizations",
  "Special Cases",
  "Stronger Versions",
  "Weaker Versions",
  "Commonly Confused",
  "Used Together",
  "Examples",
  "Related Notes"
];

const PRIORITY: Record<NoteRelationDisplayGroup, number> = {
  Prerequisites: 1,
  "Used By": 2,
  Generalizations: 3,
  "Special Cases": 3,
  "Stronger Versions": 4,
  "Weaker Versions": 4,
  "Commonly Confused": 5,
  "Used Together": 6,
  Examples: 6,
  "Related Notes": 7
};

function outgoingRelationDisplay(relation: string): NoteRelationDisplayGroup {
  switch (relation) {
    case "prerequisite":
      return "Prerequisites";
    case "used together":
      return "Used Together";
    case "commonly confused":
      return "Commonly Confused";
    case "generalization":
      return "Generalizations";
    case "special case":
      return "Special Cases";
    case "stronger version":
      return "Stronger Versions";
    case "weaker version":
      return "Weaker Versions";
    case "example of":
      return "Examples";
    default:
      return "Related Notes";
  }
}

function incomingRelationDisplay(relation: string): NoteRelationDisplayGroup {
  switch (relation) {
    case "prerequisite":
      return "Used By";
    case "used together":
      return "Used Together";
    case "commonly confused":
      return "Commonly Confused";
    case "generalization":
      return "Special Cases";
    case "special case":
      return "Generalizations";
    case "stronger version":
      return "Weaker Versions";
    case "weaker version":
      return "Stronger Versions";
    case "example of":
      return "Generalizations";
    default:
      return "Related Notes";
  }
}

function chooseBetter(
  current: NormalizedNoteRelation | undefined,
  candidate: NormalizedNoteRelation
) {
  if (!current) return candidate;
  if (candidate.priority < current.priority) return candidate;
  if (candidate.priority === current.priority && current.direction === "incoming" && candidate.direction === "outgoing") {
    return candidate;
  }
  return current;
}

export function normalizeNoteRelations({
  outgoingLinks,
  incomingLinks,
  notes
}: {
  outgoingLinks: NoteLink[];
  incomingLinks: NoteLink[];
  notes: Note[];
}): NoteRelationGroup[] {
  const noteMap = new Map(notes.map((note) => [note.id, note]));
  const byNoteId = new Map<string, NormalizedNoteRelation>();

  for (const link of outgoingLinks) {
    const note = noteMap.get(link.target_note_id);
    if (!note) continue;
    const group = outgoingRelationDisplay(link.relation_type);
    const candidate: NormalizedNoteRelation = {
      group,
      note,
      relation: link.relation_type,
      direction: "outgoing",
      priority: PRIORITY[group]
    };
    byNoteId.set(note.id, chooseBetter(byNoteId.get(note.id), candidate));
  }

  for (const link of incomingLinks) {
    const note = noteMap.get(link.source_note_id);
    if (!note) continue;
    const group = incomingRelationDisplay(link.relation_type);
    const candidate: NormalizedNoteRelation = {
      group,
      note,
      relation: link.relation_type,
      direction: "incoming",
      priority: PRIORITY[group]
    };
    byNoteId.set(note.id, chooseBetter(byNoteId.get(note.id), candidate));
  }

  return GROUP_ORDER.map((label) => ({
    label,
    items: [...byNoteId.values()]
      .filter((item) => item.group === label)
      .sort((a, b) => a.note.title.localeCompare(b.note.title))
  })).filter((group) => group.items.length > 0);
}
