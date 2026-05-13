export type Topic =
  | "Number Theory"
  | "Combinatorics"
  | "Algebra"
  | "Geometry"
  | "Inequalities"
  | "Formula Bank"
  | "Problem Patterns"
  | "Inbox";

export type NoteType =
  | "Theorem"
  | "Lemma"
  | "Technique"
  | "Formula"
  | "Trick"
  | "Common Mistake"
  | "Problem Pattern"
  | "Definition"
  | "Example"
  | "Inbox";

export interface Note {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  topic: Topic | string;
  note_type: NoteType | string;
  difficulty: number | null;
  description: string | null;
  tags: string[];
  body_markdown: string;
  diagram_urls: string[];
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type NoteDraft = Pick<
  Note,
  | "title"
  | "slug"
  | "topic"
  | "note_type"
  | "difficulty"
  | "description"
  | "tags"
  | "body_markdown"
  | "diagram_urls"
  | "is_favorite"
>;

export type SortKey = "updated" | "title" | "difficulty" | "topic";

export type ToastKind = "success" | "error" | "info";
