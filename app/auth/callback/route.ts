import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.redirect(
            `${requestUrl.origin}/auth?error=${encodeURIComponent("Supabase environment variables are not configured")}`
        )
    }

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (cookies) => {
                        cookies.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    },
                },
            }
        )

        try {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
                console.error("Auth callback error:", error)
                // Redirect to auth page with error
                return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(error.message)}`)
            }
        } catch (err) {
            console.error("Unexpected auth callback error:", err)
            return NextResponse.redirect(`${requestUrl.origin}/auth?error=Authentication failed`)
        }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(requestUrl.origin)
}
