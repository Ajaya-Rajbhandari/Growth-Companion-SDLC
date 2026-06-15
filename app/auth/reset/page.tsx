"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // The reset email link lands here via /auth/callback (which exchanges the code
  // for a recovery session), so a session should be present.
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setHasSession(!!session)
      setChecking(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setLoading(true)
    setError("")
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    setDone(true)
    setTimeout(() => router.replace("/"), 1400)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 flex-col">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex size-12 rounded-2xl bg-primary/10 items-center justify-center mb-3">
            <Lock className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="sr-only">
            <CardTitle>Reset password</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {checking ? (
              <p className="text-sm text-muted-foreground text-center py-6">Verifying your link…</p>
            ) : done ? (
              <div className="text-center space-y-3 py-2">
                <CheckCircle2 className="size-8 text-green-500 mx-auto" />
                <p className="text-sm text-foreground">Password updated. Signing you in…</p>
              </div>
            ) : !hasSession ? (
              <div className="text-center space-y-4 py-2">
                <AlertCircle className="size-8 text-destructive mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">Link expired or invalid</p>
                  <p className="text-xs text-muted-foreground mt-1">Request a new password-reset link to continue.</p>
                </div>
                <Link href="/auth">
                  <Button variant="secondary" className="w-full">Back to sign in</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pl-10 h-11"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="size-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
