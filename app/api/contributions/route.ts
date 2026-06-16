import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth/server";
import {
  SUGGESTION_DIAGRAM_MAX_COUNT,
  validateContributionPayload
} from "@/lib/security/contributionLimits";
import {
  contributionRateLimitRules,
  enforceRateLimit,
  rateLimitResponse
} from "@/lib/security/rateLimit";
import type { SiteSettings } from "@/lib/types";
import { safeFilename, validateDiagramFile } from "@/lib/utils/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof File !== "undefined" && value instanceof File && value.size > 0 ? value : null;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 415 });
  }

  const { supabase, user, profile } = await getCurrentUserProfile();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (profile?.role === "banned" || profile?.is_banned) {
    return NextResponse.json({ error: "Contribution access required." }, { status: 403 });
  }

  const limit = await enforceRateLimit(supabase, contributionRateLimitRules(user.id, request));
  if (!limit.allowed) return rateLimitResponse(limit);

  const { data: settingsData } = await supabase.from("site_settings").select("*").eq("id", "main").single();
  const settings = settingsData as SiteSettings | null;
  if (!settings?.contributions_enabled) {
    return NextResponse.json({ error: "Contributions are disabled." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid contribution payload." }, { status: 400 });

  const payload = validateContributionPayload({
    targetNoteId: formValue(formData, "target_note_id"),
    title: formValue(formData, "title"),
    suggestionType: formValue(formData, "suggestion_type"),
    topic: formValue(formData, "topic"),
    noteType: formValue(formData, "note_type"),
    difficulty: formValue(formData, "difficulty"),
    tags: formValue(formData, "tags"),
    body: formValue(formData, "body_markdown"),
    reason: formValue(formData, "reason"),
    sourceReference: formValue(formData, "source_reference")
  });

  if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: 400 });

  if (payload.value.targetNoteId) {
    const { data: targetNote } = await supabase
      .from("notes")
      .select("id")
      .eq("id", payload.value.targetNoteId)
      .eq("visibility", "public")
      .eq("is_archived", false)
      .maybeSingle();
    if (!targetNote) return NextResponse.json({ error: "Target note is not available for contributions." }, { status: 400 });
  }

  const file = formFile(formData, "diagram");
  if (formData.getAll("diagram").filter((item) => item instanceof File && item.size > 0).length > SUGGESTION_DIAGRAM_MAX_COUNT) {
    return NextResponse.json({ error: `Upload at most ${SUGGESTION_DIAGRAM_MAX_COUNT} diagrams.` }, { status: 400 });
  }

  if (file) {
    const validation = validateDiagramFile(file);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });
  }

  const suggestionId = randomUUID();
  const diagramUrls: string[] = [];

  if (file) {
    const storagePath = `${user.id}/${suggestionId}/${safeFilename(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("suggestion-diagrams")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });
    if (uploadError) {
      return NextResponse.json({ error: "Could not upload contribution diagram." }, { status: 400 });
    }
    diagramUrls.push(storagePath);
  }

  const { error: insertError } = await supabase.from("suggestions").insert({
    id: suggestionId,
    contributor_id: user.id,
    target_note_id: payload.value.targetNoteId,
    title: payload.value.title,
    suggestion_type: payload.value.suggestionType,
    topic: payload.value.topic,
    note_type: payload.value.noteType,
    difficulty: payload.value.difficulty,
    tags: payload.value.tags,
    body_markdown: payload.value.body,
    reason: payload.value.reason,
    source_reference: payload.value.sourceReference,
    diagram_urls: diagramUrls,
    status: "pending"
  });

  if (insertError) {
    if (diagramUrls.length) await supabase.storage.from("suggestion-diagrams").remove(diagramUrls);
    return NextResponse.json({ error: "Could not submit contribution." }, { status: 400 });
  }

  return NextResponse.json({ id: suggestionId }, { status: 201 });
}
