import { AppShell } from "@/components/layout/AppShell";
import { requireOwner } from "@/lib/auth/server";

export default async function ProtectedAppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireOwner();

  return <AppShell email={user.email} role={profile.role}>{children}</AppShell>;
}
