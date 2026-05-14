import { UserManagementClient } from "@/components/users/UserManagementClient";
import { requireOwner } from "@/lib/auth/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { supabase, user } = await requireOwner();
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  return <UserManagementClient profiles={(data ?? []) as Profile[]} currentUserId={user.id} />;
}
