"use client"

import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { Edit3, LogOut, User, Mail, Calendar, HelpCircle } from "lucide-react"
import { useState } from "react"
import { SeedTestDataButton } from "./seed-test-data-button"
import { OnboardingModal } from "./onboarding-modal"

export function ProfileView() {
  const { user, logout, updateUserProfile, officeHours, setOfficeHours } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      logout: state.logout,
      updateUserProfile: state.updateUserProfile,
      officeHours: state.officeHours,
      setOfficeHours: state.setOfficeHours,
    })),
  )
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name || "")
  const [saveError, setSaveError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [editOfficeHours, setEditOfficeHours] = useState(officeHours.toString())
  const [isEditingHours, setIsEditingHours] = useState(false)
  const [hoursError, setHoursError] = useState("")
  const [showHelpTour, setShowHelpTour] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/auth")
  }

  const handleUpdateProfile = async () => {
    const name = editName.trim()
    if (!name) return
    setIsSaving(true)
    setSaveError("")
    try {
      await updateUserProfile({ name })
      setIsEditing(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to update profile.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateOfficeHours = () => {
    const hours = Number.parseInt(editOfficeHours, 10)
    setHoursError("")
    try {
      if (isNaN(hours) || hours < 1 || hours > 24) {
        throw new Error("Office hours must be between 1 and 24 hours")
      }
      setOfficeHours(hours)
      setIsEditingHours(false)
    } catch (error) {
      setHoursError(error instanceof Error ? error.message : "Invalid office hours")
    }
  }

  if (!user) {
    return null
  }

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Profile</h2>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="size-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="size-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-foreground">{user.name}</h3>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="border-border bg-transparent">
                  <Edit3 className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Full Name</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditName(user.name)
                        setIsEditing(false)
                      }}
                      className="bg-secondary text-secondary-foreground"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateProfile} className="bg-primary text-primary-foreground" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                  {saveError && <p className="text-xs text-destructive">{saveError}</p>}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Mail className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium text-foreground">{joinDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="size-5" />
            Office Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Maximum Hours Per Day</p>
              <p className="text-xs text-muted-foreground mt-1">
                Set the maximum number of work hours allowed per day (1-24 hours)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isEditingHours ? (
                <>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={editOfficeHours}
                    onChange={(e) => setEditOfficeHours(e.target.value)}
                    className="w-20 bg-input border-border"
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdateOfficeHours}
                    className="bg-primary text-primary-foreground"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditOfficeHours(officeHours.toString())
                      setIsEditingHours(false)
                      setHoursError("")
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-lg font-semibold text-foreground">{officeHours} hours</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingHours(true)}
                    className="border-border bg-transparent"
                  >
                    <Edit3 className="size-3 mr-1" />
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>
          {hoursError && <p className="text-xs text-destructive">{hoursError}</p>}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <HelpCircle className="size-5" />
            Help & Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => setShowHelpTour(true)}
            variant="outline"
            className="w-full border-border bg-transparent hover:bg-muted"
          >
            <HelpCircle className="size-4 mr-2" />
            Take App Tour
          </Button>
          <p className="text-xs text-muted-foreground pt-2">
            Learn about all features, AI capabilities, and how to use the app effectively.
          </p>
        </CardContent>
      </Card>

      <SeedTestDataButton />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <LogOut className="size-4 mr-2" />
            Sign Out
          </Button>
          <p className="text-xs text-muted-foreground pt-2">
            All your data is securely stored and will be preserved for your next visit.
          </p>
        </CardContent>
      </Card>

      {/* Help Tour Modal */}
      {showHelpTour && (
        <OnboardingModal
          forceOpen={true}
          onClose={() => {
            setShowHelpTour(false)
            // Reset to first step when closing
            useAppStore.getState().setOnboardingStep(0)
          }}
        />
      )}
    </div>
  )
}
