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
  | "Formula Log"
  | "Trick"
  | "Common Mistake"
  | "Problem Pattern"
  | "Past Problem"
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

export type CaptureType =
  | "Rough Note"
  | "Theorem"
  | "Technique"
  | "Formula"
  | "Mistake"
  | "Problem Pattern"
  | "Geometry Diagram"
  | "Problem Log";

export interface QuickCapture {
  id: string;
  user_id: string;
  raw_text: string;
  capture_type: CaptureType | string;
  topic_guess: Topic | string | null;
  tags: string[];
  attachment_urls: string[];
  converted_note_id: string | null;
  is_converted: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type ProblemStatus =
  | "unsolved"
  | "attempted"
  | "solved"
  | "solved_with_hint"
  | "failed"
  | "review_later"
  | "mastered";

export interface ProblemLog {
  id: string;
  user_id: string;
  title: string;
  source: string | null;
  olympiad: string | null;
  year: number | null;
  problem_number: string | null;
  difficulty: number | null;
  status: ProblemStatus;
  problem_text: string | null;
  solution_summary: string | null;
  key_idea: string | null;
  mistake_made: string | null;
  linked_note_ids: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type MistakeType =
  | "Forgot condition"
  | "Algebra slip"
  | "False assumption"
  | "Diagram trap"
  | "Missed invariant"
  | "Wrong modulo step"
  | "Overcomplicated solution"
  | "Misread problem"
  | "Weak proof"
  | "Other";

export interface MistakeLog {
  id: string;
  user_id: string;
  title: string;
  topic: Topic | string | null;
  mistake_type: MistakeType | string | null;
  description: string;
  correct_principle: string | null;
  example: string | null;
  linked_note_ids: string[];
  linked_problem_id: string | null;
  severity: number;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export type NoteLinkRelation =
  | "related"
  | "prerequisite"
  | "stronger version"
  | "weaker version"
  | "commonly confused"
  | "used together"
  | "example of"
  | "generalization"
  | "special case";

export interface NoteLink {
  id: string;
  user_id: string;
  source_note_id: string;
  target_note_id: string;
  relation_type: NoteLinkRelation | string;
  created_at: string;
}

export type ReviewStatus =
  | "new"
  | "learning"
  | "needs_practice"
  | "comfortable"
  | "mastered"
  | "ignored";

export interface NoteReview {
  id: string;
  user_id: string;
  note_id: string;
  review_status: ReviewStatus;
  confidence: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface Diagram {
  id: string;
  user_id: string;
  note_id: string | null;
  storage_path: string;
  public_url: string | null;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  caption: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteVersion {
  id: string;
  user_id: string;
  note_id: string;
  title: string | null;
  body_markdown: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
