import type { StateCreator } from "zustand"
import { supabase } from "../supabase"
import { trackEvent } from "../analytics"
import type { FeatureName, FlagOverrides, ViewId } from "../feature-flags"
import type { AppState } from "./index"

export interface UiSlice {
  activeView: ViewId
  hasCompletedOnboarding: boolean
  currentOnboardingStep: number
  featureOverrides: FlagOverrides

  setActiveView: (view: ViewId) => void
  loadFeatureFlags: () => Promise<void>
  setOnboardingStatus: (completed: boolean) => void
  setOnboardingStep: (step: number) => void
  completeOnboarding: () => Promise<void>
  skipOnboarding: () => Promise<void>
}

export const createUiSlice: StateCreator<
  AppState,
  [["zustand/persist", unknown]],
  [],
  UiSlice
> = (set, get) => ({
  activeView: "dashboard",
  hasCompletedOnboarding: false,
  currentOnboardingStep: 0,
  featureOverrides: {},

  setActiveView: (view) => set({ activeView: view }),

  loadFeatureFlags: async () => {
    const { data, error } = await supabase.from("feature_flags").select("name, enabled")
    if (error || !data) return
    const overrides: FlagOverrides = {}
    for (const row of data as { name: string; enabled: boolean }[]) {
      overrides[row.name as FeatureName] = row.enabled
    }
    set({ featureOverrides: overrides })
  },

  setOnboardingStatus: (completed: boolean) => {
    set({
      hasCompletedOnboarding: completed,
      currentOnboardingStep: completed ? 0 : get().currentOnboardingStep,
    })
  },

  setOnboardingStep: (step: number) => {
    set({ currentOnboardingStep: step })
  },

  completeOnboarding: async () => {
    const { error } = await supabase.auth.updateUser({
      data: { hasCompletedOnboarding: true },
    })
    if (error) throw error
    const completedAtStep = get().currentOnboardingStep
    set({ hasCompletedOnboarding: true, currentOnboardingStep: 0 })
    trackEvent("onboarding_completed", get().user?.id, { step: completedAtStep })
  },

  skipOnboarding: async () => {
    const { error } = await supabase.auth.updateUser({
      data: { hasCompletedOnboarding: true },
    })
    if (error) throw error
    const skippedAtStep = get().currentOnboardingStep
    set({ hasCompletedOnboarding: true, currentOnboardingStep: 0 })
    trackEvent("onboarding_skipped", get().user?.id, { step: skippedAtStep })
  },
})
