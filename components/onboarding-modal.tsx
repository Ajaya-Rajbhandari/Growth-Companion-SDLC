"use client"

import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, ChevronRight, CheckCircle2, LayoutDashboard, CheckSquare, FileText, Clock, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

const onboardingSteps = [
  {
    id: 0,
    title: "Welcome to Companion",
    description: "Your personal productivity assistant for tasks, notes, and time tracking",
    icon: Sparkles,
    tips: ["Track your work with precision", "Organize your ideas effortlessly", "Never lose sight of your goals"],
  },
  {
    id: 1,
    title: "Dashboard Overview",
    description:
      "Get instant insights into your productivity, tasks, and work sessions. View your progress at a glance.",
    icon: LayoutDashboard,
    tips: [
      "See your weekly activity and productivity rate",
      "View pending tasks and recent notes",
      "Track your work consistency",
    ],
  },
  {
    id: 2,
    title: "Manage Your Tasks",
    description:
      "Create, prioritize, and track tasks with different priority levels. Mark them complete as you progress.",
    icon: CheckSquare,
    tips: ["Set priority levels (low, medium, high)", "Track task completion rates", "Filter by status and priority"],
  },
  {
    id: 3,
    title: "Take Smart Notes",
    description:
      "Capture ideas and important information with categories and tags. Search and organize your thoughts easily.",
    icon: FileText,
    tips: ["Organize notes by category", "Tag notes for quick filtering", "Format with bold, italic, and code"],
  },
  {
    id: 4,
    title: "Track Your Time",
    description:
      "Clock in/out to track work sessions, manage breaks, and switch between tasks. Generate detailed timesheets.",
    icon: Clock,
    tips: [
      "Start a work session with a task title",
      "Take 30-minute breaks automatically",
      "Switch tasks mid-session",
      "Export timesheet reports",
    ],
  },
  {
    id: 5,
    title: "AI Assistant",
    description:
      "Get help with task creation, productivity tips, and timesheet management through natural conversation.",
    icon: Sparkles,
    tips: ["Ask to create tasks and notes", "Get productivity recommendations", "Manage timesheet operations via chat"],
  },
]

export function OnboardingModal() {
  const { hasCompletedOnboarding, currentOnboardingStep, setOnboardingStep, completeOnboarding, skipOnboarding } =
    useAppStore(
      useShallow((state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        currentOnboardingStep: state.currentOnboardingStep,
        setOnboardingStep: state.setOnboardingStep,
        completeOnboarding: state.completeOnboarding,
        skipOnboarding: state.skipOnboarding,
      })),
    )
  const [isVisible, setIsVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    // Show onboarding only on first login
    if (!hasCompletedOnboarding) {
      setIsVisible(true)
    }
  }, [hasCompletedOnboarding])

  if (!isVisible || hasCompletedOnboarding) {
    return null
  }

  const step = onboardingSteps[currentOnboardingStep]
  const Icon = step.icon
  const isLastStep = currentOnboardingStep === onboardingSteps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      setErrorMessage("")
      void completeOnboarding()
        .then(() => {
          setIsVisible(false)
        })
        .catch(() => {
          setErrorMessage("Failed to save onboarding status. Please try again.")
        })
    } else {
      setOnboardingStep(currentOnboardingStep + 1)
    }
  }

  const handleSkip = () => {
    setErrorMessage("")
    void skipOnboarding()
      .then(() => {
        setIsVisible(false)
      })
      .catch(() => {
        setErrorMessage("Failed to save onboarding status. Please try again.")
      })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardContent className="p-8 space-y-6">
          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Step {currentOnboardingStep + 1} of {onboardingSteps.length}
              </span>
              <span className="text-muted-foreground">
                {Math.round(((currentOnboardingStep + 1) / onboardingSteps.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentOnboardingStep + 1) / onboardingSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="text-center space-y-4">
            <div className="size-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
              <Icon className="size-8 text-primary" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{step.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </div>

            {/* Tips */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Pro Tips:</p>
              {step.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setOnboardingStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentOnboardingStep
                    ? "bg-primary w-6"
                    : index < currentOnboardingStep
                      ? "bg-primary/50 w-2"
                      : "bg-muted w-2"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleSkip}
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              Skip Tour
            </Button>
            <Button onClick={handleNext} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {isLastStep ? "Get Started" : "Next"}
              <ChevronRight className="size-4 ml-2" />
            </Button>
          </div>

          {errorMessage && <p className="text-xs text-destructive text-center">{errorMessage}</p>}

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground">
            You can access this tour anytime from your settings
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
