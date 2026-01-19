"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { AlertCircle, Chrome, Mail, Lock, User } from "lucide-react"

export default function AuthPage() {
  const router = useRouter()
  const { login, signup, loginWithGoogle, authError, setAuthError, isLoggedIn, authInitialized } =
    useAppStore(
      useShallow((state) => ({
        login: state.login,
        signup: state.signup,
        loginWithGoogle: state.loginWithGoogle,
        authError: state.authError,
        setAuthError: state.setAuthError,
        isLoggedIn: state.isLoggedIn,
        authInitialized: state.authInitialized,
      })),
    )
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  // Check for error in URL params (from auth callback) - client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get("error")
      if (errorParam) {
        setAuthError(decodeURIComponent(errorParam))
      }
    }
  }, [setAuthError])

  // Redirect if already logged in
  useEffect(() => {
    if (authInitialized && isLoggedIn) {
      router.push("/")
    }
  }, [authInitialized, isLoggedIn, router])

  // Don't render the form if already logged in
  if (!authInitialized || isLoggedIn) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAuthError("")

    try {
      if (mode === "login") {
        await login(email, password)
      } else {
        await signup(name, email, password)
      }

      router.push("/")
    } catch (error: any) {
      console.error("Auth error:", error)
      setAuthError(error.message || "Authentication failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setAuthError("")
    try {
      await loginWithGoogle()
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      setAuthError(error.message || "Google sign-in failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4 md:p-6 flex-col">
      {/* Brand Section */}
      <div className="mb-6 md:mb-8 text-center">
        <div className="inline-flex items-center justify-center size-12 md:size-14 rounded-2xl bg-primary/10 mb-3 md:mb-4">
          <Mail className="size-6 md:size-7 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Companion</h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1">Your productivity AI assistant</p>
      </div>

      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="space-y-2 text-center p-4 sm:p-6">
          <CardTitle className="text-xl md:text-2xl font-bold text-foreground">
            {mode === "login" ? "Welcome Back" : "Get Started"}
          </CardTitle>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {mode === "login" ? "Sign in to your account" : "Create your account to begin"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-5 p-4 sm:p-6">
          {/* Google Sign-In Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full bg-background border-border hover:bg-secondary text-foreground text-sm md:text-base h-10 md:h-11"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <Chrome className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Continue with Google</span>
          </Button>


          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs md:text-sm">
              <span className="px-2 bg-card text-muted-foreground">Or with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs md:text-sm font-medium text-foreground block mb-1.5 md:mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-input border-border text-sm pl-10 h-10 md:h-11"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs md:text-sm font-medium text-foreground block mb-1.5 md:mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input border-border text-sm pl-10 h-10 md:h-11"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="text-xs md:text-sm font-medium text-foreground block mb-1.5 md:mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input border-border text-sm pl-10 h-10 md:h-11"
                  disabled={loading}
                />
              </div>
              {mode === "signup" && <p className="text-xs text-muted-foreground mt-1">At least 6 characters</p>}
            </div>

            {/* Error Display */}
            {authError && (
              <div className="flex items-start gap-2 p-2.5 md:p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs md:text-sm text-destructive">{authError}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground text-sm md:text-base h-10 md:h-11 font-medium"
              disabled={loading}
            >
              {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          {/* Mode Toggle */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs md:text-sm">
              <span className="px-2 bg-card text-muted-foreground">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full bg-secondary text-secondary-foreground text-sm md:text-base h-10 md:h-11"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login")
              setAuthError("")
            }}
          >
            {mode === "login" ? "Create Account" : "Sign In"}
          </Button>

          {/* Terms & Privacy */}
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <button className="underline hover:text-foreground transition-colors">Terms</button> and{" "}
            <button className="underline hover:text-foreground transition-colors">Privacy Policy</button>
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground mt-6 md:mt-8">© 2026 Companion. All rights reserved.</p>
    </div>
  )
}


