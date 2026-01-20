"use client"

import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  X,
  ChevronRight,
  CheckCircle2,
  LayoutDashboard,
  CheckSquare,
  FileText,
  Clock,
  Sparkles,
  Target,
  Flame,
  Calendar,
  HelpCircle,
} from "lucide-react"
import { useEffect, useState } from "react"

const onboardingSteps = [
  {
    id: 0,
    title: "Welcome to Companion",
    description: "Your personal productivity assistant for tasks, notes, time tracking, goals, and habits",
    icon: Sparkles,
    tips: ["Track your work with precision", "Organize your ideas effortlessly", "Never lose sight of your goals", "Build lasting habits"],
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
      "Monitor goals and habits progress",
    ],
  },
  {
    id: 2,
    title: "Manage Your Tasks",
    description:
      "Create, prioritize, and track tasks with different priority levels. Mark them complete as you progress.",
    icon: CheckSquare,
    tips: ["Set priority levels (low, medium, high)", "Track task completion rates", "Filter by status and priority", "Set due dates and urgency levels"],
  },
  {
    id: 3,
    title: "Take Smart Notes",
    description:
      "Capture ideas and important information with categories and tags. Search and organize your thoughts easily.",
    icon: FileText,
    tips: ["Organize notes by category", "Tag notes for quick filtering", "Format with bold, italic, and code", "Search across all your notes"],
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
      "View time history by day, week, month, or year",
    ],
  },
  {
    id: 5,
    title: "Set & Track Goals",
    description:
      "Create meaningful goals, track progress, and achieve milestones. Organize by categories and set target dates.",
    icon: Target,
    tips: [
      "Create goals with descriptions and target dates",
      "Track progress from 0% to 100%",
      "Add and complete milestones",
      "Manage goal status (active, completed, paused)",
      "Organize goals by categories",
    ],
  },
  {
    id: 6,
    title: "Build Habits",
    description:
      "Create daily habits, log your progress, and track streaks. Build consistency with visual feedback.",
    icon: Flame,
    tips: [
      "Create habits with custom frequencies",
      "Log habit completion daily",
      "Track your current streak",
      "Set target counts per day/week",
      "View habit statistics and history",
    ],
  },
  {
    id: 7,
    title: "Calendar View",
    description:
      "See all your tasks, time entries, goals, and habits in one unified calendar view. Plan your days effectively.",
    icon: Calendar,
    tips: [
      "View events in month, week, or day views",
      "Filter by type (tasks, time, goals, habits)",
      "Navigate to specific dates",
      "See upcoming deadlines and events",
    ],
  },
  {
    id: 8,
    title: "AI Assistant - Your Smart Helper",
    description:
      "Your AI assistant can help with everything! Ask it to create tasks, manage goals, track time, and much more.",
    icon: Sparkles,
    tips: [
      "Ask: 'Create a task to learn TypeScript'",
      "Say: 'Show me progress on my active goals'",
      "Try: 'Clock me in for React development'",
      "Request: 'What's on my calendar today?'",
      "Command: 'Delete all goals that haven't been started'",
      "Ask: 'Help me plan my day'",
      "💡 Tip: The AI learns from your feedback to improve!",
    ],
  },
]

interface OnboardingModalProps {
  forceOpen?: boolean
  onClose?: () => void
}

export function OnboardingModal({ forceOpen, onClose }: OnboardingModalProps = {}) {
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
    // Show onboarding on first login or if forced open
    if (forceOpen || !hasCompletedOnboarding) {
      setIsVisible(true)
    }
  }, [hasCompletedOnboarding, forceOpen])

  if (!isVisible) {
    return null
  }

  const step = onboardingSteps[currentOnboardingStep]
  const Icon = step.icon
  const isLastStep = currentOnboardingStep === onboardingSteps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      setErrorMessage("")
      if (!forceOpen) {
        void completeOnboarding()
          .then(() => {
            setIsVisible(false)
            onClose?.()
          })
          .catch(() => {
            setErrorMessage("Failed to save onboarding status. Please try again.")
          })
      } else {
        setIsVisible(false)
        onClose?.()
      }
    } else {
      setOnboardingStep(currentOnboardingStep + 1)
    }
  }

  const handleSkip = () => {
    setErrorMessage("")
    if (!forceOpen) {
      void skipOnboarding()
        .then(() => {
          setIsVisible(false)
          onClose?.()
        })
        .catch(() => {
          setErrorMessage("Failed to save onboarding status. Please try again.")
        })
    } else {
      setIsVisible(false)
      onClose?.()
    }
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
          {!forceOpen && (
            <p className="text-xs text-center text-muted-foreground">
              You can access this tour anytime from your profile settings
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
