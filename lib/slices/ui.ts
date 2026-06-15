import type { StateCreator } from "zustand"
import { supabase } from "../supabase"
import { trackEvent } from "../analytics"
import type { ViewId } from "../feature-flags"
import type { AppState } from "./index"

export interface UiSlice {
  activeView: ViewId
  hasCompletedOnboarding: boolean
  currentOnboardingStep: number

  setActiveView: (view: ViewId) => void
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

  setActiveView: (view) => set({ activeView: view }),

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
