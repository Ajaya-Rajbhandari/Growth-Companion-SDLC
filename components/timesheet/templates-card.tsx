"use client"

import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"

export function TemplatesCard() {
  const { workTemplates, deleteWorkTemplate } = useAppStore(
    useShallow((state) => ({
      workTemplates: state.workTemplates,
      deleteWorkTemplate: state.deleteWorkTemplate,
    })),
  )

  if (workTemplates.length === 0) return null

  return (
    <Card className="mb-3 sm:mb-4">
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
              <Button variant="ghost" size="sm" onClick={() => deleteWorkTemplate(template.id)}>
                ×
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
