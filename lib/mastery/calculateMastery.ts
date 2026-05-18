import { MATH_TOPICS, topicIncludes } from "@/lib/constants/notes";
import type { MistakeLog, Note, NoteReview, ProblemLog } from "@/lib/types";

export interface MasteryRow {
  topic: string;
  totalNotes: number;
  masteredNotes: number;
  comfortableNotes: number;
  needsPracticeNotes: number;
  learningNotes: number;
  failedProblems: number;
  reviewLaterProblems: number;
  mistakeCount: number;
  averageConfidence: number | null;
  score: number;
  label: "Weak" | "Developing" | "Good" | "Strong" | "Unknown";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreLabel(score: number, hasData: boolean): MasteryRow["label"] {
  if (!hasData) return "Unknown";
  if (score <= 25) return "Weak";
  if (score <= 50) return "Developing";
  if (score <= 75) return "Good";
  return "Strong";
}

export function calculateMastery({
  notes,
  reviews,
  problems,
  mistakes
}: {
  notes: Note[];
  reviews: NoteReview[];
  problems: ProblemLog[];
  mistakes: MistakeLog[];
}): MasteryRow[] {
  const reviewMap = new Map(reviews.map((review) => [review.note_id, review]));

  return MATH_TOPICS.map((topic) => {
    const topicNotes = notes.filter((note) => topicIncludes(note.topic, topic));
    const topicReviews = topicNotes.flatMap((note) => {
      const review = reviewMap.get(note.id);
      return review ? [review] : [];
    });
    const topicProblems = problems.filter((problem) => topicIncludes(problem.topic, topic));
    const topicMistakes = mistakes.filter((mistake) => topicIncludes(mistake.topic, topic) && !mistake.is_resolved);

    const masteredNotes = topicReviews.filter((review) => review.review_status === "mastered").length;
    const comfortableNotes = topicReviews.filter((review) => review.review_status === "comfortable").length;
    const needsPracticeNotes = topicReviews.filter((review) => review.review_status === "needs_practice").length;
    const learningNotes = topicReviews.filter((review) => review.review_status === "learning").length;
    const failedProblems = topicProblems.filter((problem) => problem.status === "failed").length;
    const reviewLaterProblems = topicProblems.filter((problem) => problem.status === "review_later").length;
    const averageConfidence = topicReviews.length
      ? topicReviews.reduce((sum, review) => sum + review.confidence, 0) / topicReviews.length
      : null;

    const score = clampScore(
      50 +
        Math.min(masteredNotes * 10, 25) +
        Math.min(comfortableNotes * 5, 20) -
        needsPracticeNotes * 8 -
        learningNotes * 4 -
        failedProblems * 10 -
        reviewLaterProblems * 6 -
        topicMistakes.length * 5
    );
    const hasData = topicNotes.length + topicProblems.length + topicMistakes.length > 0;

    return {
      topic,
      totalNotes: topicNotes.length,
      masteredNotes,
      comfortableNotes,
      needsPracticeNotes,
      learningNotes,
      failedProblems,
      reviewLaterProblems,
      mistakeCount: topicMistakes.length,
      averageConfidence,
      score,
      label: scoreLabel(score, hasData)
    };
  });
}
