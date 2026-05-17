import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserProfile } from "@/lib/auth/server";
import { normalizeNotebookConfig } from "@/lib/notebook/defaultNotebookConfig";
import { buildNotebookForUser } from "@/lib/notebook/server";

const notebookAssistSchema = z.object({
  mode: z.enum(["suggest_preset", "missing_sections", "cover_summary"]),
  goal: z.string().max(3000).default(""),
  config: z.unknown().optional()
});

function deepSeekConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";

  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY.");
  return {
    apiKey,
    model,
    endpoint: `${baseUrl.replace(/\/$/, "")}/chat/completions`
  };
}

function modeInstruction(mode: z.infer<typeof notebookAssistSchema>["mode"]) {
  if (mode === "suggest_preset") {
    return "Suggest a Notebook Builder preset config for the owner's goal. Return concise JSON with markdown explanation and an optional configPatch object.";
  }
  if (mode === "missing_sections") {
    return "Identify selected notebook notes that appear to be missing important statement, example, proof, conditions, or common mistake sections. Return Markdown only.";
  }
  return "Draft a concise serious cover summary for this notebook export. Do not invent theorem statements or sources.";
}

function parseAssistant(content: string) {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    return { markdown: trimmed };
  }
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await getCurrentUserProfile();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (profile?.role !== "owner" || profile?.is_banned) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = notebookAssistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid notebook AI request." }, { status: 400 });

  const config = normalizeNotebookConfig(parsed.data.config);
  const result = await buildNotebookForUser(supabase, user.id, config);
  const sampleItems = result.items.slice(0, 30).map((item) => ({
    title: item.title,
    sourceType: item.sourceType,
    topic: item.topic,
    noteType: item.noteType,
    tags: item.tags,
    sectionKeys: Object.keys(item.extractedSections).filter((key) => item.extractedSections[key as keyof typeof item.extractedSections])
  }));

  let apiConfig: ReturnType<typeof deepSeekConfig>;
  try {
    apiConfig = deepSeekConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "DeepSeek is not configured." },
      { status: 500 }
    );
  }

  const response = await fetch(apiConfig.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiConfig.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: apiConfig.model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are an Olympiad mathematics notebook assistant. Never rewrite official content automatically. Do not invent theorem statements, sources, or claims."
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              task: modeInstruction(parsed.data.mode),
              owner_goal: parsed.data.goal,
              config,
              item_count: result.itemCount,
              sample_items: sampleItems
            },
            null,
            2
          )
        }
      ]
    })
  });

  if (!response.ok) {
    return NextResponse.json({ error: "DeepSeek notebook assistance failed." }, { status: 502 });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return NextResponse.json(parseAssistant(typeof content === "string" ? content : ""));
}
