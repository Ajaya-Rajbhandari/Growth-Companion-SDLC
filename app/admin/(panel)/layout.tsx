import { redirect } from "next/navigation"
import { getAuthenticatedUser, isAdminServer } from "@/lib/server/auth"
import { AdminShell } from "@/components/admin/admin-shell"

export const metadata = { title: "Admin · Companion" }

// Server-gates every /admin panel route before any admin UI reaches the browser.
// Signed-out OR signed-in-but-not-admin both land on the dedicated /admin/login,
// which explains the situation instead of bouncing to the consumer /auth.
// Defense in depth on top of the SECURITY DEFINER RPCs that already refuse
// non-admins at the data layer.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser()
  if (!user || !(await isAdminServer())) redirect("/admin/login")

  return <AdminShell>{children}</AdminShell>
}
