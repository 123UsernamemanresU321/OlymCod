import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUserProfile } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to manage Olympiad Codex notes and contribution reviews."
};

export default async function LoginPage() {
  const { user, profile } = await getCurrentUserProfile();

  if (user) {
    redirect(profile?.role === "owner" ? "/app" : "/contribution-status");
  }

  return <LoginForm />;
}
