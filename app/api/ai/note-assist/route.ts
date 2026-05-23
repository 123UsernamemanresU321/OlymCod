import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserProfile } from "@/lib/auth/server";
import {
  buildNoteTemplate,
  getNoteFormat,
  noteTypeDifficultyMeta,
  noteTypeLearningFields
} from "@/lib/constants/note-formats";

const assistModes = [
  "starter_draft",
  "fill_missing_sections",
  "improve_current_section",
  "analyze_mistake",
  "past_problem_scaffold",
  "suggest_metadata",
  "suggest_recognition_triggers",
  "suggest_false_uses",
  "ask_my_codex",
  "clean_rough_capture",
  "suggest_related_notes",
  "generate_recall_questions",
  "find_common_mistakes",
  "turn_problem_into_technique"
] as const;

const noteContextSchema = z.object({
  id: z.string().nullable().optional(),
  title: z.string().max(180).default(""),
  topic: z.string().max(80).default(""),
  note_type: z.string().max(80).default(""),
  difficulty: z.number().int().min(1).max(12).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().max(60)).max(20).default([]),
  body_markdown: z.string().max(50000).default(""),
  recognition_triggers: z.array(z.string().max(120)).max(20).default([]),
  false_uses: z.array(z.string().max(200)).max(20).default([])
});

const allowedRelationTypes = [
  "prerequisite",
  "related",
  "used together",
  "commonly confused",
  "stronger version",
  "weaker version",
  "generalization",
  "special case"
] as const;

const assistRequestSchema = z.object({
  mode: z.enum(assistModes),
  instruction: z.string().max(4000).default(""),
  userInstruction: z.string().max(4000).optional(),
  selectedText: z.string().max(16000).default(""),
  note: noteContextSchema,
  codexNotes: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string(),
        topic: z.string().nullable().optional(),
        note_type: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        description: z.string().nullable().optional(),
        body_markdown: z.string().optional()
      })
    )
    .max(40)
    .optional()
});

const aiResponseSchema = z.object({
  markdown: z.string().default(""),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  recognition_triggers: z.array(z.string()).optional(),
  false_uses: z.array(z.string()).optional(),
  link_suggestions: z
    .array(
      z.object({
        targetNoteId: z.string().optional(),
        targetTitle: z.string(),
        relationType: z.enum(allowedRelationTypes),
        reason: z.string(),
        confidence: z.number().min(0).max(1).optional()
      })
    )
    .optional(),
  possible_new_notes: z.array(z.object({ title: z.string(), reason: z.string().optional() })).optional()
});

type AssistMode = (typeof assistModes)[number];

function deepSeekConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY.");
  }

  return {
    apiKey,
    model,
    endpoint: `${baseUrl.replace(/\/$/, "")}/chat/completions`
  };
}

function modeInstruction(mode: AssistMode) {
  const instructions: Record<AssistMode, string> = {
    starter_draft:
      "Create a strong starter draft for the note. Follow the note type's structure and leave concise placeholders only where the user must supply missing facts.",
    fill_missing_sections:
      "Fill sections that are empty, vague, or placeholder-like. Preserve useful existing content and do not rewrite complete sections unnecessarily.",
    improve_current_section:
      "Improve the selected section or, if no section is selected, improve the most relevant part of the note. Keep the same mathematical meaning unless you clearly mark uncertainty.",
    analyze_mistake:
      "Turn the user's described mistake into a useful olympiad mistake analysis: warning signs, why it is tempting, correct principle, and repair strategy.",
    past_problem_scaffold:
      "Create a past problem writeup scaffold with source, problem statement, observations, solution plan, mistakes, key takeaway, and related techniques.",
    suggest_metadata:
      "Suggest only concise metadata: description and tags. Return markdown as an empty string unless a short note is genuinely needed.",
    suggest_recognition_triggers:
      "Suggest 3 to 8 short recognition trigger phrases for this note. These should be contest-problem signals, not full sentences. Return them in recognition_triggers.",
    suggest_false_uses:
      "Suggest 3 to 8 common false uses, missing conditions, or traps for this note. Return them in false_uses.",
    ask_my_codex:
      "Answer the owner's question using only the provided Codex notes as context. Cite note titles used and say when the answer is not present.",
    clean_rough_capture:
      "Turn a messy quick capture into a structured note draft. Keep uncertain claims clearly marked.",
    suggest_related_notes:
      "Suggest possible note links using only provided existing note IDs and titles. Return link_suggestions only. Do not write or rewrite note Markdown.",
    generate_recall_questions:
      "Generate 3 to 5 recall questions that test whether the owner understands this note. Include concise answer hints.",
    find_common_mistakes:
      "List likely common mistakes, missing conditions, and traps related to this note.",
    turn_problem_into_technique:
      "Extract the key technique from the problem context, suggest relevant existing note titles, and draft a possible mistake-log entry."
  };

  return instructions[mode];
}

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseAssistantContent(content: string) {
  try {
    const parsed = JSON.parse(stripCodeFence(content));
    return aiResponseSchema.parse(parsed);
  } catch {
    return aiResponseSchema.parse({ markdown: content.trim() });
  }
}

function buildPrompt(input: z.infer<typeof assistRequestSchema>) {
  const format = getNoteFormat(input.note.note_type);
  const difficultyMeta = noteTypeDifficultyMeta(input.note.note_type);
  const learningFields = noteTypeLearningFields(input.note.note_type);
  const template = buildNoteTemplate(input.note.note_type, input.note.title || "[Title]");

  const responseShape =
    input.mode === "suggest_related_notes"
      ? '{"markdown":"","link_suggestions":[{"targetNoteId":"existing note id only","targetTitle":"existing title only","relationType":"prerequisite|related|used together|commonly confused|stronger version|weaker version|generalization|special case","reason":"short reason","confidence":0.0}],"possible_new_notes":[{"title":"optional non-existing note title","reason":"why it might be useful"}]}'
      : '{"markdown":"Markdown content to preview or insert","description":"optional short note description or null","tags":["optional","tags"],"recognition_triggers":["optional trigger phrases"],"false_uses":["optional traps"]}';

  return [
    `Task: ${modeInstruction(input.mode)}`,
    "",
    "Return one JSON object with this exact shape:",
    responseShape,
    "",
    "Directional note-link semantics:",
    "- relation_type is always from the current note to the candidate note.",
    "- If the current note is broader and the candidate is narrower, use 'special case'.",
    "- If the candidate is broader than the current note, use 'generalization'.",
    "- Example: current note Euler Phi Theorem -> candidate Fermat's Little Theorem = 'special case'.",
    "- Example: current note Fermat's Little Theorem -> candidate Euler Phi Theorem = 'generalization'.",
    "- Allowed relation types: prerequisite, related, used together, commonly confused, stronger version, weaker version, generalization, special case.",
    "- Never invent targetNoteId. If a useful note does not exist, put it under possible_new_notes instead.",
    "- For suggest_related_notes, markdown must be an empty string.",
    "- Follow the app's note-type conventions. Do not add Recognition Triggers unless this note type supports them.",
    "- Do not add Common False Uses unless this note type supports them.",
    `- Difficulty label for this note type: ${difficultyMeta.usesDifficulty ? difficultyMeta.label : "none"}.`,
    `- Recognition Triggers supported: ${learningFields.recognitionTriggers ? "yes" : "no"}.`,
    `- Common False Uses supported: ${learningFields.falseUses ? "yes" : "no"}.`,
    "",
    "Note context:",
    JSON.stringify(
      {
        title: input.note.title,
        topic: input.note.topic,
        note_type: input.note.note_type,
        note_type_description: format.description,
        difficulty_label: difficultyMeta.usesDifficulty ? difficultyMeta.label : null,
        difficulty: difficultyMeta.usesDifficulty ? input.note.difficulty : null,
        description: input.note.description,
        tags: input.note.tags,
        recognition_triggers: input.note.recognition_triggers,
        false_uses: input.note.false_uses,
        template,
        current_markdown: input.note.body_markdown,
        selected_text: input.selectedText,
        owner_instruction: input.instruction || input.userInstruction,
        available_codex_notes: input.codexNotes ?? []
      },
      null,
      2
    )
  ].join("\n");
}

export async function POST(request: Request) {
  // API routes cannot use requireOwner() because that helper redirects page requests.
  const { supabase, user, profile } = await getCurrentUserProfile();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (profile?.role !== "owner" || profile.is_banned) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const rawBody = await request.json().catch(() => null);
  if (rawBody && typeof rawBody === "object" && "userInstruction" in rawBody && !("instruction" in rawBody)) {
    (rawBody as { instruction?: unknown; userInstruction?: unknown }).instruction = (
      rawBody as { userInstruction?: unknown }
    ).userInstruction;
  }
  const parsed = assistRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid AI assistance request." }, { status: 400 });
  }

  const contextHungryModes: AssistMode[] = [
    "ask_my_codex",
    "suggest_related_notes",
    "turn_problem_into_technique"
  ];
  if (contextHungryModes.includes(parsed.data.mode) && !parsed.data.codexNotes?.length) {
    const { data: notesData } = await supabase
      .from("notes")
      .select("id, title, topic, note_type, tags, description, body_markdown")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(35);
    parsed.data.codexNotes = (notesData ?? []).map((note) => ({
      id: String(note.id),
      title: String(note.title),
      topic: note.topic,
      note_type: note.note_type,
      tags: note.tags ?? [],
      description: note.description,
      body_markdown: String(note.body_markdown ?? "").slice(0, 1600)
    }));
  }

  let config: ReturnType<typeof deepSeekConfig>;
  try {
    config = deepSeekConfig();
  } catch (configError) {
    return NextResponse.json(
      { error: configError instanceof Error ? configError.message : "DeepSeek is not configured." },
      { status: 500 }
    );
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content:
            "You are an Olympiad mathematics writing assistant for a private knowledge base. Produce accurate, concise Markdown. Preserve LaTeX as $...$ or $$...$$. Do not invent official problem sources. Mark uncertain mathematical claims clearly. Return valid JSON only."
        },
        {
          role: "user",
          content: buildPrompt(parsed.data)
        }
      ],
      stream: false,
      temperature: 0.35
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return NextResponse.json(
      { error: "DeepSeek request failed.", detail: detail.slice(0, 500) },
      { status: 502 }
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "DeepSeek returned no usable content." }, { status: 502 });
  }

  const output = parseAssistantContent(content);
  const learningFields = noteTypeLearningFields(parsed.data.note.note_type);
  const noteById = new Map((parsed.data.codexNotes ?? []).flatMap((note) => (note.id ? [[note.id, note]] : [])));
  const noteByTitle = new Map((parsed.data.codexNotes ?? []).map((note) => [note.title.toLowerCase(), note]));
  const linkSuggestions = (output.link_suggestions ?? [])
    .flatMap((suggestion) => {
      const matched =
        (suggestion.targetNoteId ? noteById.get(suggestion.targetNoteId) : undefined) ??
        noteByTitle.get(suggestion.targetTitle.toLowerCase());
      if (!matched?.id) return [];
      return [
        {
          targetNoteId: matched.id,
          targetTitle: matched.title,
          relationType: suggestion.relationType,
          reason: suggestion.reason.trim(),
          confidence: Math.max(0, Math.min(1, suggestion.confidence ?? 0.75))
        }
      ];
    })
    .slice(0, 8);

  return NextResponse.json({
    markdown: parsed.data.mode === "suggest_related_notes" ? "" : output.markdown,
    description: output.description ?? null,
    tags: (output.tags ?? []).map((tag) => tag.trim()).filter(Boolean).slice(0, 12),
    recognition_triggers: learningFields.recognitionTriggers
      ? (output.recognition_triggers ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 8)
      : [],
    false_uses: learningFields.falseUses
      ? (output.false_uses ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 8)
      : [],
    link_suggestions: parsed.data.mode === "suggest_related_notes" ? linkSuggestions : [],
    possible_new_notes: parsed.data.mode === "suggest_related_notes" ? (output.possible_new_notes ?? []).slice(0, 5) : [],
    model: config.model
  });
}
