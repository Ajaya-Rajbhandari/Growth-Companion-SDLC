"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { deriveDisplayName } from "@/lib/utils"
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
        const applySessionUser = (sessionUser: {
            id: string
            email?: string
            created_at: string
            user_metadata: Record<string, unknown>
        }) => {
            const metadata = sessionUser.user_metadata
            const officeHours = typeof metadata.office_hours === "number" ? metadata.office_hours : 9
            const graceMinutes = typeof metadata.grace_minutes === "number" ? metadata.grace_minutes : 0
            const allowOverworkMinutes =
                typeof metadata.allow_overwork_minutes === "number" ? metadata.allow_overwork_minutes : 60

            setUser({
                id: sessionUser.id,
                name: deriveDisplayName(metadata.full_name as string | undefined, sessionUser.email),
                email: sessionUser.email || "",
                createdAt: sessionUser.created_at,
                officeHours,
                graceMinutes,
                allowOverworkMinutes,
            })
            useAppStore.setState({ officeHours, graceMinutes, allowOverworkMinutes })
            setOnboardingStatus(Boolean(metadata.hasCompletedOnboarding))
        }

        const hydrateAuthenticatedUser = async (
            sessionUser: Parameters<typeof applySessionUser>[0],
        ) => {
            applySessionUser(sessionUser)
            await useAppStore.getState().fetchInitialData()
        }

        // Load DB feature-flag overrides (public-read) so live admin toggles apply.
        useAppStore.getState().loadFeatureFlags()

        // 1. Check current session
        let isMounted = true
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!isMounted) return
            if (session?.user) {
                await hydrateAuthenticatedUser(session.user)
            } else {
                setUser(null)
            }
            if (!isMounted) return
            setAuthInitialized(true)
        })

        // 2. Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                // Keep the auth callback synchronous. Supabase operations awaited
                // inside this callback can block later client requests.
                applySessionUser(session.user)
                void useAppStore.getState().fetchInitialData()
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
