import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";

type RpcError = { message?: string } | null;
interface RateLimitClient {
  rpc(functionName: string, args: Record<string, unknown>): unknown;
}

export interface RateLimitRule {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  status: 429 | 503;
  error: string;
  retryAfter: number;
  correlationId?: string;
}

const DEFAULT_RETRY_AFTER = 60;

function hashIdentifier(value: string) {
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "olympiad-codex";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwardedFor ||
    "unknown"
  );
}

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function enforceRateLimit(client: RateLimitClient, rules: RateLimitRule[]) {
  for (const rule of rules) {
    const { data, error } = await (client.rpc("check_rate_limit", {
      p_scope: rule.scope,
      p_identifier_hash: hashIdentifier(rule.identifier),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds
    }) as PromiseLike<{ data: boolean | null; error: RpcError }>);

    if (error) {
      const correlationId = randomUUID();
      console.warn("Rate limit check failed", {
        correlationId,
        scope: rule.scope,
        message: error.message
      });
      return {
        allowed: false,
        status: 503 as const,
        error: "This action is temporarily unavailable.",
        retryAfter: DEFAULT_RETRY_AFTER,
        correlationId
      };
    }

    if (data !== true) {
      return {
        allowed: false,
        status: 429 as const,
        error: "Too many requests. Try again shortly.",
        retryAfter: Math.max(DEFAULT_RETRY_AFTER, Math.min(rule.windowSeconds, 3600))
      };
    }
  }

  return { allowed: true as const };
}

export function rateLimitResponse(result: Exclude<Awaited<ReturnType<typeof enforceRateLimit>>, { allowed: true }>) {
  return NextResponse.json(
    { error: result.error, correlationId: result.correlationId },
    {
      status: result.status,
      headers: {
        "Retry-After": String(result.retryAfter),
        "Cache-Control": "no-store"
      }
    }
  );
}

export function contributionRateLimitRules(userId: string, request: Request) {
  const ip = getRequestIp(request);
  return [
    { scope: "contributions:user:hour", identifier: userId, limit: 5, windowSeconds: 60 * 60 },
    { scope: "contributions:user:day", identifier: userId, limit: 20, windowSeconds: 60 * 60 * 24 },
    { scope: "contributions:ip:hour", identifier: ip, limit: 20, windowSeconds: 60 * 60 }
  ];
}

export function aiRateLimitRules(userId: string, request: Request) {
  const ip = getRequestIp(request);
  return [
    { scope: "ai:user:hour", identifier: userId, limit: 20, windowSeconds: 60 * 60 },
    { scope: "ai:user:day", identifier: userId, limit: 80, windowSeconds: 60 * 60 * 24 },
    { scope: "ai:ip:hour", identifier: ip, limit: 60, windowSeconds: 60 * 60 }
  ];
}

export function exportRateLimitRules(userId: string, request: Request) {
  const ip = getRequestIp(request);
  return [
    { scope: "exports:user:hour", identifier: userId, limit: 30, windowSeconds: 60 * 60 },
    { scope: "exports:ip:hour", identifier: ip, limit: 60, windowSeconds: 60 * 60 }
  ];
}

export function magicLinkRateLimitRules(email: string, request: Request) {
  const ip = getRequestIp(request);
  return [
    { scope: "magic-link:email:hour", identifier: email, limit: 3, windowSeconds: 60 * 60 },
    { scope: "magic-link:ip:hour", identifier: ip, limit: 10, windowSeconds: 60 * 60 }
  ];
}
