"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setAuthInitialized, setOnboardingStatus } = useAppStore(
        useShallow((state) => ({
            setUser: state.setUser,
            setAuthInitialized: state.setAuthInitialized,
            setOnboardingStatus: state.setOnboardingStatus,
        }))
    )

    useEffect(() => {
        // 1. Check current session
        let isMounted = true
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!isMounted) return
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    name: session.user.user_metadata.full_name || session.user.email?.split("@")[0] || "User",
                    email: session.user.email || "",
                    createdAt: session.user.created_at,
                })
                setOnboardingStatus(Boolean(session.user.user_metadata?.hasCompletedOnboarding))
                useAppStore.getState().fetchInitialData()
            } else {
                setUser(null)
            }
            setAuthInitialized(true)
        })

        // 2. Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    name: session.user.user_metadata.full_name || session.user.email?.split("@")[0] || "User",
                    email: session.user.email || "",
                    createdAt: session.user.created_at,
                })
                setOnboardingStatus(Boolean(session.user.user_metadata?.hasCompletedOnboarding))
                useAppStore.getState().fetchInitialData()
            } else {
                setUser(null)
            }
            setAuthInitialized(true)
        })

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [setUser, setAuthInitialized, setOnboardingStatus])

    return <>{children}</>
}
