"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { LayoutDashboard, Users, ScrollText, Shield, LogOut } from "lucide-react"
import { AdminSessionGuard, ADMIN_REMEMBER, clearAdminSession } from "./admin-session-guard"

const SECTIONS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/events", label: "Events", icon: ScrollText, exact: false },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  const handleLogout = async () => {
    clearAdminSession()
    localStorage.removeItem(ADMIN_REMEMBER)
    await supabase.auth.signOut()
    router.replace("/admin/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Admin sidebar */}
      <aside className="w-60 border-r border-border bg-card/40 backdrop-blur flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="size-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold tracking-tight text-sm">Admin</h1>
              <p className="text-[11px] text-muted-foreground">Companion CMS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {SECTIONS.map((s) => {
            const active = isActive(s.href, s.exact)
            return (
              <Link
                key={s.href}
                href={s.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <s.icon className={cn("size-4", active && "text-primary")} />
                {s.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </aside>

      <AdminSessionGuard />
      <main className="flex-1 ml-60 p-4 sm:p-6 lg:p-8 overflow-x-hidden">{children}</main>
    </div>
  )
}
