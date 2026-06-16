import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth/server";
import { normalizeNotebookConfig } from "@/lib/notebook/defaultNotebookConfig";
import { exportNotebookJson } from "@/lib/notebook/exportJson";
import { buildNotebookForUser } from "@/lib/notebook/server";
import { enforceRateLimit, exportRateLimitRules, rateLimitResponse } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  const { supabase, user, profile } = await getCurrentUserProfile();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (profile?.role !== "owner" || profile?.is_banned) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const limit = await enforceRateLimit(supabase, exportRateLimitRules(user.id, request));
  if (!limit.allowed) return rateLimitResponse(limit);

  const body = await request.json().catch(() => ({}));
  const config = normalizeNotebookConfig((body as { config?: unknown }).config);
  // buildNotebookForUser filters every selected source by user_id = user.id before producing JSON.
  const result = await buildNotebookForUser(supabase, user.id, config);

  return NextResponse.json(exportNotebookJson(result.items, result.config), {
    headers: {
      "Content-Disposition": 'attachment; filename="olympiad-codex-notebook.json"'
    }
  });
}
