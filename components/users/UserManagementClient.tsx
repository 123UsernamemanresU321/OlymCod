"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { USER_ROLES } from "@/lib/constants/notes";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types";
import { formatUpdatedAt } from "@/lib/utils/notes";

interface UserManagementClientProps {
  profiles: Profile[];
  currentUserId: string;
}

export function UserManagementClient({ profiles, currentUserId }: UserManagementClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const ownerCount = profiles.filter((profile) => profile.role === "owner" && !profile.is_banned).length;

  async function updateProfile(profile: Profile, update: Partial<Pick<Profile, "role" | "is_banned">>) {
    setMessage(null);
    if (profile.id === currentUserId && (update.role && update.role !== "owner" || update.is_banned)) {
      setMessage("You cannot demote or ban yourself.");
      return;
    }
    if (profile.role === "owner" && update.role && update.role !== "owner" && ownerCount <= 1) {
      setMessage("Cannot remove the last owner.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("profiles").update(update).eq("id", profile.id);
    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase.from("audit_logs").insert({
      actor_id: currentUserId,
      action: update.role ? "user_role_changed" : update.is_banned ? "user_banned" : "user_unbanned",
      target_type: "profile",
      target_id: profile.id,
      metadata: update
    });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-10">
      <header>
        <h1 className="text-3xl font-semibold">Users</h1>
        <p className="mt-2 text-[#43474f]">Manage contributor roles and suspensions.</p>
      </header>
      {message ? <p className="mt-5 rounded border border-[#c3c6d0] bg-white p-3 text-sm text-[#43474f]">{message}</p> : null}
      <section className="mt-8 overflow-hidden rounded-lg border border-[#c3c6d0] bg-white">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 border-b border-[#c3c6d0] bg-[#f9f9f9] p-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#43474f]">
          <span>User</span>
          <span>Role</span>
          <span>Created</span>
          <span>Actions</span>
        </div>
        {profiles.map((profile) => (
          <div key={profile.id} className="grid grid-cols-1 gap-3 border-b border-[#c3c6d0] p-4 last:border-0 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:items-center">
            <div className="min-w-0">
              <p className="truncate font-medium">{profile.display_name || profile.email || profile.id}</p>
              <p className="truncate text-sm text-[#43474f]">{profile.email}</p>
            </div>
            <select
              className={inputClassName()}
              value={profile.role}
              disabled={profile.id === currentUserId}
              onChange={(event) => void updateProfile(profile, { role: event.target.value as UserRole, is_banned: event.target.value === "banned" })}
            >
              {USER_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <span className="text-sm text-[#43474f]">{formatUpdatedAt(profile.created_at)}</span>
            <div className="flex flex-wrap gap-2">
              <Badge tone={profile.is_banned || profile.role === "banned" ? "red" : "green"}>
                {profile.is_banned || profile.role === "banned" ? "banned" : "active"}
              </Badge>
              {profile.is_banned || profile.role === "banned" ? (
                <Button type="button" variant="secondary" disabled={profile.id === currentUserId} onClick={() => void updateProfile(profile, { is_banned: false, role: "contributor" })}>
                  Unban
                </Button>
              ) : (
                <Button type="button" variant="danger" disabled={profile.id === currentUserId} onClick={() => void updateProfile(profile, { is_banned: true, role: "banned" })}>
                  Ban
                </Button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
