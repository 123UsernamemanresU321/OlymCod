import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUserProfile } from "@/lib/auth/server";

export default async function LoginPage() {
  const { user, profile } = await getCurrentUserProfile();

  if (user) {
    redirect(profile?.role === "owner" ? "/app" : "/contribution-status");
  }

  return <LoginForm />;
}
