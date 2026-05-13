"use client";

import { useState } from "react";
import { ArrowRight, BookOpen, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePasswordAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/app`
            }
          });

    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setNotice("Check your email to confirm your account, then sign in.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function sendMagicLink() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/app`
      }
    });

    setBusy(false);

    if (magicError) {
      setError(magicError.message);
      return;
    }

    setNotice("Magic link sent. Check your email to continue.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f9f9] px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-lg border border-[#c3c6d0] bg-[#e2e2e2] text-[#0e3b69] shadow-sm">
            <BookOpen className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-5xl font-semibold leading-tight text-[#0e3b69]">Olympiad Codex</h1>
          <p className="mx-auto mt-4 max-w-sm text-lg leading-8 text-[#43474f]">
            Your private Olympiad maths handbook. Create, search, and edit your mathematical notes
            anywhere.
          </p>
        </div>

        <form
          onSubmit={handlePasswordAuth}
          className="rounded-xl border border-[#c3c6d0] bg-white p-6 shadow-[0_4px_6px_rgba(26,32,44,0.05)]"
        >
          {error ? (
            <div className="mb-5 rounded border border-[#ffb4ab] bg-[#ffdad6] px-4 py-3 text-sm text-[#8f1d15]">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="mb-5 rounded border border-[#8eb6ee] bg-[#dbeafe] px-4 py-3 text-sm text-[#0e3b69]">
              {notice}
            </div>
          ) : null}

          <div className="grid gap-6">
            <Field label="Email Address">
              <input
                className={inputClassName()}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="euler@example.com"
                required
                autoComplete="email"
              />
            </Field>

            <Field label="Password">
              <input
                className={inputClassName()}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </Field>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Working..." : mode === "signin" ? "Continue" : "Create Account"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>

          <div className="my-6 flex items-center gap-4 text-[13px] font-medium uppercase tracking-[0.05em] text-[#43474f]">
            <div className="h-px flex-1 bg-[#c3c6d0]" />
            OR
            <div className="h-px flex-1 bg-[#c3c6d0]" />
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={sendMagicLink}
            disabled={busy || !email}
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            Send Magic Link
          </Button>

          <button
            type="button"
            className="mt-5 w-full text-center text-[13px] font-medium tracking-[0.04em] text-[#0e3b69]"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already registered? Sign in"}
          </button>
        </form>

        <div className="mt-6 flex justify-center gap-4 text-[13px] font-medium tracking-[0.04em] text-[#43474f]">
          <span>Privacy Policy</span>
          <span>·</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </div>
  );
}
