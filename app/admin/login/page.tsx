"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Shield, Lock, Mail, AlertCircle, Chrome } from "lucide-react"
import { ADMIN_SESSION_START, ADMIN_REMEMBER } from "@/components/admin/admin-session-guard"

type Screen = "checking" | "form" | "noAccess"

async function callerIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin")
  return !error && data === true
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>("checking")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(false)
  const [expiredNotice, setExpiredNotice] = useState("")

  const markAdminSession = () => {
    localStorage.setItem(ADMIN_SESSION_START, String(Date.now()))
    localStorage.setItem(ADMIN_REMEMBER, remember ? "1" : "0")
  }

  // Show why the previous admin session ended (set by the session guard).
  useEffect(() => {
    const expired = new URLSearchParams(window.location.search).get("expired")
    if (expired === "idle") setExpiredNotice("Your admin session timed out after inactivity. Please sign in again.")
    else if (expired === "week") setExpiredNotice("Your admin session reached its 7-day limit. Please sign in again.")
  }, [])

  // If already signed in, route admins straight into the panel; show a clear
  // "no access" state for signed-in non-admins instead of a blank redirect.
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        if (await callerIsAdmin()) router.replace("/admin")
        else setScreen("noAccess")
      } else {
        setScreen("form")
      }
    })
    return () => {
      mounted = false
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) {
      setError(signInErr.message)
      setLoading(false)
      return
    }
    if (await callerIsAdmin()) {
      markAdminSession()
      router.replace("/admin")
      return
    }
    setScreen("noAccess")
    setLoading(false)
  }

  const signOutAndRetry = async () => {
    await supabase.auth.signOut()
    setEmail("")
    setPassword("")
    setError("")
    setScreen("form")
  }

  const handleGoogle = async () => {
    setError("")
    // Persist the "remember me" choice across the OAuth redirect (the session
    // start is stamped by the guard when the admin lands on /admin).
    localStorage.setItem(ADMIN_REMEMBER, remember ? "1" : "0")
    // Return to /admin/login after OAuth; this page then verifies admin and routes.
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin/login` },
    })
    if (oauthErr) setError(oauthErr.message)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 flex-col">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex size-12 rounded-2xl bg-gradient-to-br from-primary to-accent items-center justify-center mb-3">
            <Shield className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Access</h1>
          <p className="text-sm text-muted-foreground mt-1">Companion CMS</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            {screen === "checking" && (
              <p className="text-sm text-muted-foreground text-center py-6">Checking access…</p>
            )}

            {screen === "noAccess" && (
              <div className="text-center space-y-4 py-2">
                <AlertCircle className="size-8 text-destructive mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">No admin access</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You're signed in, but this account isn't on the admin allowlist.
                  </p>
                </div>
                <Button variant="secondary" className="w-full" onClick={signOutAndRetry}>
                  Sign in with a different account
                </Button>
              </div>
            )}

            {screen === "form" && (
              <div className="space-y-4">
                {expiredNotice && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{expiredNotice}</p>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 bg-background"
                  onClick={handleGoogle}
                >
                  <Chrome className="size-4 mr-2" />
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-card text-muted-foreground">Or with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-4 rounded border-border accent-primary"
                  />
                  Remember me (skip the 30-min inactivity timeout)
                </label>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="size-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                  <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                    {loading ? "Signing in…" : "Sign in to Admin"}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
