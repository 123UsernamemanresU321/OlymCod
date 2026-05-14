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

export type UserRole = "owner" | "trusted_contributor" | "contributor" | "viewer" | "banned";
export type NoteVisibility = "private" | "public";

export type SuggestionType =
  | "typo"
  | "correction"
  | "addition"
  | "new_note"
  | "diagram"
  | "formula"
  | "explanation"
  | "example"
  | "related_technique"
  | "common_mistake"
  | "other";

export type SuggestionStatus = "pending" | "approved" | "rejected" | "needs_changes" | "merged" | "spam";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

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
  visibility: NoteVisibility;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
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
  | "visibility"
  | "is_favorite"
>;

export type SortKey = "updated" | "title" | "difficulty" | "topic";

export type ToastKind = "success" | "error" | "info";

export interface Suggestion {
  id: string;
  contributor_id: string | null;
  target_note_id: string | null;
  title: string;
  suggestion_type: SuggestionType;
  topic: Topic | string | null;
  note_type: NoteType | string | null;
  difficulty: number | null;
  tags: string[];
  body_markdown: string;
  reason: string | null;
  source_reference: string | null;
  diagram_urls: string[];
  status: SuggestionStatus;
  owner_feedback: string | null;
  owner_internal_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  merged_note_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSettings {
  id: "main" | string;
  owner_id: string | null;
  public_notes_enabled: boolean;
  contributions_enabled: boolean;
  require_login_to_contribute: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
