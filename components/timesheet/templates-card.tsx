"use client"

import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export function TemplatesCard() {
  const { workTemplates, deleteWorkTemplate } = useAppStore(
    useShallow((state) => ({
      workTemplates: state.workTemplates,
      deleteWorkTemplate: state.deleteWorkTemplate,
    })),
  )

  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteWorkTemplate(id)
      toast({ title: "Template deleted", description: `"${title}" removed.` })
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete template.",
        variant: "destructive",
      })
    }
  }

  if (workTemplates.length === 0) return null

  return (
    // The parent already applies space-y-*; the mb-* this used to carry
    // double-gapped it. Density now matches its siblings on this screen.
    <Card density="compact">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Saved Templates ({workTemplates.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {workTemplates.map((template) => (
            <div key={template.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <p className="font-medium text-sm">{template.title}</p>
                <p className="text-xs text-foreground/70">Used {template.usageCount} times</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(template.id, template.title)}
                aria-label={`Delete template ${template.title}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
