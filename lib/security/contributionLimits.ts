import { NOTE_TYPES, SUGGESTION_TYPES } from "@/lib/constants/notes";
import type { SuggestionType } from "@/lib/types";

export const SUGGESTION_TITLE_MAX = 180;
export const SUGGESTION_BODY_MAX = 50000;
export const SUGGESTION_REASON_MAX = 2000;
export const SUGGESTION_SOURCE_MAX = 500;
export const SUGGESTION_TAG_MAX_COUNT = 20;
export const SUGGESTION_TAG_MAX_LENGTH = 60;
export const SUGGESTION_DIAGRAM_MAX_COUNT = 5;
export const CONTRIBUTION_COMMENT_BODY_MAX = 4000;
export const CONTRIBUTION_TOPIC_MAX = 120;

export interface ContributionPayloadInput {
  targetNoteId?: unknown;
  title?: unknown;
  suggestionType?: unknown;
  topic?: unknown;
  noteType?: unknown;
  difficulty?: unknown;
  tags?: unknown;
  body?: unknown;
  reason?: unknown;
  sourceReference?: unknown;
}

export interface ValidContributionPayload {
  targetNoteId: string | null;
  title: string;
  suggestionType: SuggestionType;
  topic: string | null;
  noteType: string | null;
  difficulty: number | null;
  tags: string[];
  body: string;
  reason: string | null;
  sourceReference: string | null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseTags(value: unknown) {
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated tags for older clients.
  }

  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function fail(error: string) {
  return { ok: false as const, error };
}

export function validateContributionPayload(input: ContributionPayloadInput) {
  const title = asString(input.title);
  const body = asString(input.body);
  const reason = asString(input.reason);
  const sourceReference = asString(input.sourceReference);
  const targetNoteId = asString(input.targetNoteId) || null;
  const topic = asString(input.topic) || null;
  const noteType = asString(input.noteType) || null;
  const suggestionType = asString(input.suggestionType);
  const tags = Array.from(new Set(parseTags(input.tags)));
  const difficultyText = asString(input.difficulty);
  const difficulty = difficultyText ? Number(difficultyText) : null;

  if (!title) return fail("Suggestion title is required.");
  if (title.length > SUGGESTION_TITLE_MAX) return fail(`Suggestion title must be ${SUGGESTION_TITLE_MAX} characters or fewer.`);
  if (!body) return fail("Suggestion body is required.");
  if (body.length > SUGGESTION_BODY_MAX) return fail(`Suggestion body must be ${SUGGESTION_BODY_MAX} characters or fewer.`);
  if (reason.length > SUGGESTION_REASON_MAX) return fail(`Reason must be ${SUGGESTION_REASON_MAX} characters or fewer.`);
  if (sourceReference.length > SUGGESTION_SOURCE_MAX) return fail(`Source reference must be ${SUGGESTION_SOURCE_MAX} characters or fewer.`);
  if (topic && topic.length > CONTRIBUTION_TOPIC_MAX) return fail(`Topic must be ${CONTRIBUTION_TOPIC_MAX} characters or fewer.`);
  if (noteType && !NOTE_TYPES.includes(noteType as never)) return fail("Unsupported note type.");
  if (!SUGGESTION_TYPES.includes(suggestionType as never)) return fail("Unsupported suggestion type.");
  if (tags.length > SUGGESTION_TAG_MAX_COUNT) return fail(`Use ${SUGGESTION_TAG_MAX_COUNT} tags or fewer.`);
  if (tags.some((tag) => tag.length > SUGGESTION_TAG_MAX_LENGTH)) {
    return fail(`Each tag must be ${SUGGESTION_TAG_MAX_LENGTH} characters or fewer.`);
  }
  if (difficulty !== null && (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 12)) {
    return fail("Difficulty must be between 1 and 12.");
  }

  return {
    ok: true as const,
    value: {
      targetNoteId,
      title,
      suggestionType: suggestionType as SuggestionType,
      topic,
      noteType,
      difficulty,
      tags,
      body,
      reason: reason || null,
      sourceReference: sourceReference || null
    } satisfies ValidContributionPayload
  };
}
