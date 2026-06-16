import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  enforceRateLimit,
  magicLinkRateLimitRules,
  normalizeEmail,
  rateLimitResponse
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const GENERIC_MESSAGE = "If this email can sign in, a magic link will be sent shortly.";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = await createClient();
  const limit = await enforceRateLimit(supabase, magicLinkRateLimitRules(email, request));
  if (!limit.allowed) return rateLimitResponse(limit);

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/app`
    }
  });

  if (error) {
    console.warn("Magic link request failed", { message: error.message });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
