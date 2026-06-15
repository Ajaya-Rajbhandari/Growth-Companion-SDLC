import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient, User } from "@supabase/supabase-js"

// Builds a Supabase server client bound to the request's auth cookies, so calls
// run as the signed-in user (RLS / auth.uid() apply). Null if env is missing.
async function createServerSupabase(): Promise<SupabaseClient | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })
}

// Resolves the authenticated user from the Supabase auth cookies on an API request.
// Returns null when env vars are missing or the session is absent/invalid.
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createServerSupabase()
  if (!supabase) return null
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

// Server-side admin check. Calls the SECURITY DEFINER is_admin() RPC as the
// signed-in user — the same gate the data uses — so the /admin route can redirect
// non-admins before rendering anything.
export async function isAdminServer(): Promise<boolean> {
  const supabase = await createServerSupabase()
  if (!supabase) return false
  const { data, error } = await supabase.rpc("is_admin")
  return !error && data === true
}
