import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SiteSettings } from "@/lib/types";

export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: ensured } = await supabase.rpc("ensure_current_profile").single();
  const profile = ensured as Profile | null;

  return { supabase, user, profile };
}

export async function requireOwner() {
  const context = await getCurrentUserProfile();

  if (!context.user) {
    redirect("/login");
  }

  if (context.profile?.role !== "owner" || context.profile.is_banned) {
    redirect("/contribution-status");
  }

  return {
    supabase: context.supabase,
    user: context.user,
    profile: context.profile
  };
}

export async function requireContributor(next = "/contribute/new") {
  const context = await getCurrentUserProfile();

  if (!context.user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (context.profile?.role === "banned" || context.profile?.is_banned) {
    redirect("/contribution-status");
  }

  return {
    supabase: context.supabase,
    user: context.user,
    profile: context.profile
  };
}

export async function getSiteSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").eq("id", "main").single();
  return data as SiteSettings | null;
}
