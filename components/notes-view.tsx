"use client"

import { useState } from "react"
import { useAppStore, type Note } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, Edit3, AlertCircle, Lightbulb, Search, Bold, Italic, Code, X, Tag, Folder } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

const CATEGORIES = [
  { value: "work", label: "Work", color: "bg-blue-500/20 text-blue-400" },
  { value: "personal", label: "Personal", color: "bg-purple-500/20 text-purple-400" },
  { value: "ideas", label: "Ideas", color: "bg-green-500/20 text-green-400" },
  { value: "meeting", label: "Meeting", color: "bg-orange-500/20 text-orange-400" },
  { value: "other", label: "Other", color: "bg-gray-500/20 text-gray-400" },
]

export function NotesView() {
  const { notes, addNote, updateNote, deleteNote } = useAppStore(
    useShallow((state) => ({
      notes: state.notes,
      addNote: state.addNote,
      updateNote: state.updateNote,
      deleteNote: state.deleteNote,
    })),
  )
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState<Note["category"]>("work")
  const [newTags, setNewTags] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [titleError, setTitleError] = useState("")
  const [contentWarning, setContentWarning] = useState("")
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

  const handleAddNote = () => {
    setTitleError("")

    if (!newTitle.trim()) {
      setTitleError("Note title is required")
      return
    }

    if (newTitle.length > 100) {
      setTitleError("Title must be less than 100 characters")
      return
    }

    if (newContent.length > 5000) {
      setContentWarning("Content is very long. Consider breaking into multiple notes.")
      setTimeout(() => setContentWarning(""), 4000)
    }

    const tags = newTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    addNote({
      title: newTitle.trim(),
      content: newContent,
      category: newCategory,
      tags,
    })
      .then(() => {
        toast({
          title: "Note added",
          description: `"${newTitle.trim()}" saved.`,
        })
        setNewTitle("")
        setNewContent("")
        setNewCategory("work")
        setNewTags("")
        setIsAddingNote(false)
        setTitleError("")
      })
      .catch((error) => {
        toast({
          title: "Note failed",
          description: error instanceof Error ? error.message : "Unable to save note.",
        })
      })
  }

  const handleUpdateNote = () => {
    setTitleError("")

    if (!editingNote || !editingNote.title.trim()) {
      setTitleError("Note title is required")
      return
    }

    if (editingNote.title.length > 100) {
      setTitleError("Title must be less than 100 characters")
      return
    }

    updateNote(editingNote.id, {
      title: editingNote.title,
      content: editingNote.content,
      category: editingNote.category,
      tags: editingNote.tags,
    })
      .then(() => {
        toast({
          title: "Note updated",
          description: `"${editingNote.title}" saved.`,
        })
        setEditingNote(null)
        setTitleError("")
      })
      .catch((error) => {
        toast({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Unable to update note.",
        })
      })
  }

  const handleFormat = (format: "bold" | "italic" | "code") => {
    if (editingNote) {
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement
      const start = textarea?.selectionStart || 0
      const end = textarea?.selectionEnd || 0
      const selected = editingNote.content.substring(start, end)

      const formatters = {
        bold: `**${selected}**`,
        italic: `*${selected}*`,
        code: ```${selected}```,
      }

      const newContent =
        editingNote.content.substring(0, start) + formatters[format] + editingNote.content.substring(end)
      setEditingNote({ ...editingNote, content: newContent })
    }
  }

  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags?.some((tag) => tag.toLowerCase().includes(query))

    const matchesCategory = !filterCategory || note.category === filterCategory

    return matchesSearch && matchesCategory
  })

  const aiSuggestions = []
  if (notes.length === 0) {
    aiSuggestions.push({
      type: "tip",
      icon: Lightbulb,
      title: "Get Started with Notes",
      description: "Create your first note to capture ideas, plans, and important information.",
    })
  }

  if (notes.length > 20) {
    aiSuggestions.push({
      type: "organization",
      icon: AlertCircle,
      title: "Organize Your Notes",
      description: `You have ${notes.length} notes. Use categories and tags for better organization.`,
    })
  }

  const longNotes = notes.filter((n) => n.content.length > 3000)
  if (longNotes.length > 0) {
    aiSuggestions.push({
      type: "optimization",
      icon: Lightbulb,
      title: "Large Notes Found",
      description: "Some notes are very long. Breaking them into smaller, focused notes can improve readability.",
    })
  }

  const getCategoryColor = (category?: string) => {
    return CATEGORIES.find((c) => c.value === category)?.color || "bg-gray-500/20 text-gray-400"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Notes</h2>
          <p className="text-muted-foreground mt-1">Capture and organize your thoughts</p>
        </div>
        <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="size-4 mr-2" />
              New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Create New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Input
                  placeholder="Note title (max 100 characters)"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value)
                    setTitleError("")
                  }}
                  className="bg-input border-border"
                  maxLength={100}
                />
                {titleError && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {titleError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{newTitle.length}/100 characters</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2 flex items-center gap-2">
                    <Folder className="size-4" />
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Note["category"])}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2 flex items-center gap-2">
                    <Tag className="size-4" />
                    Tags
                  </label>
                  <Input
                    placeholder="tag1, tag2, tag3"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <div>
                <div className="flex gap-1 mb-2 border-b border-border pb-2">
                  <Button size="sm" variant="ghost" onClick={() => handleFormat("bold")} className="hover:bg-secondary">
                    <Bold className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFormat("italic")}
                    className="hover:bg-secondary"
                  >
                    <Italic className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleFormat("code")} className="hover:bg-secondary">
                    <Code className="size-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Write your note here... Use **bold**, *italic*, or `code` formatting (max 5000 characters)"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={8}
                  className="bg-input border-border resize-none font-mono text-sm"
                  maxLength={5000}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">{newContent.length}/5000 characters</p>
                  {newContent.length > 4500 && <p className="text-xs text-chart-3">Note is approaching size limit</p>}
                </div>
              </div>
              {contentWarning && (
                <p className="text-xs text-chart-3 flex items-center gap-1">
                  <Lightbulb className="size-3" />
                  {contentWarning}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsAddingNote(false)
                    setTitleError("")
                  }}
                  className="bg-secondary text-secondary-foreground"
                >
                  Cancel
                </Button>
                <Button onClick={handleAddNote} className="bg-primary text-primary-foreground">
                  Save Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterCategory(null)}
          className={filterCategory === null ? "bg-primary" : "border-border"}
        >
          All Notes
        </Button>
        {CATEGORIES.map((category) => (
          <Button
            key={category.value}
            variant={filterCategory === category.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCategory(filterCategory === category.value ? null : category.value)}
            className={cn(filterCategory === category.value && category.color, "border-border")}
          >
            <Folder className="size-3 mr-1" />
            {category.label}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input
          placeholder="Search notes by title, content, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-input border-border pl-10"
        />
      </div>

      {selectedNote ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          <div className="lg:col-span-1 bg-card border border-border rounded-lg p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Notes</h3>
              <Button size="sm" variant="ghost" onClick={() => setSelectedNote(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all text-sm",
                    selectedNote?.id === note.id
                      ? "bg-primary/10 border-primary"
                      : "bg-secondary border-border hover:bg-secondary/80",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {note.category && (
                      <span className={cn("text-xs px-2 py-1 rounded", getCategoryColor(note.category))}>
                        {note.category}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-foreground truncate mt-1">{note.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{note.content.substring(0, 50)}...</p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 overflow-y-auto space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{selectedNote.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(selectedNote.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingNote(selectedNote)}
                  className="hover:bg-secondary"
                >
                  <Edit3 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    deleteNote(selectedNote.id)
                      .then(() => {
                        toast({
                          title: "Note deleted",
                          description: `"${selectedNote.title}" removed.`,
                        })
                        setSelectedNote(null)
                      })
                      .catch((error) => {
                        toast({
                          title: "Delete failed",
                          description: error instanceof Error ? error.message : "Unable to delete note.",
                        })
                      })
                  }}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            {selectedNote.category && (
              <div
                className={cn(
                  "inline-block px-3 py-1 rounded text-sm font-medium",
                  getCategoryColor(selectedNote.category),
                )}
              >
                {CATEGORIES.find((c) => c.value === selectedNote.category)?.label}
              </div>
            )}

            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedNote.tags.map((tag) => (
                  <span key={tag} className="inline-block px-2 py-1 bg-secondary rounded text-xs text-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="prose prose-invert max-w-none pt-4 border-t border-border">
              <p className="text-foreground whitespace-pre-wrap break-words">{selectedNote.content}</p>
            </div>

            {editingNote && editingNote.id === selectedNote.id && (
              <Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
                <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Note</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Input
                        value={editingNote.title}
                        onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                        className="bg-input border-border"
                        maxLength={100}
                      />
                      <p className="text-xs text-muted-foreground mt-1">{editingNote.title.length}/100</p>
                    </div>
                    <Textarea
                      value={editingNote.content}
                      onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                      rows={8}
                      className="bg-input border-border resize-none font-mono text-sm"
                      maxLength={5000}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setEditingNote(null)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateNote}>Save Changes</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      ) : (
        <>
          {aiSuggestions.length > 0 && (
            <div className="space-y-2">
              {aiSuggestions.map((suggestion, idx) => (
                <Card key={idx} className="bg-card border-l-4 border-l-accent">
                  <CardContent className="py-3 flex items-start gap-3">
                    <suggestion.icon className="size-5 text-accent mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-card-foreground">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <Card
                key={note.id}
                className="bg-card border-border cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setSelectedNote(note)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{note.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {note.category && (
                      <span className={cn("text-xs px-2 py-1 rounded flex-shrink-0", getCategoryColor(note.category))}>
                        {note.category}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{note.content}</p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-secondary px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground pt-1">+{note.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredNotes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No notes found. Create one to get started!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
