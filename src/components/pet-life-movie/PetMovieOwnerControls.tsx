"use client"

import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function PetMovieOwnerControls({
  projectId,
  locale,
  expiresAt,
}: {
  projectId: string
  locale: string
  expiresAt: string
}) {
  const [token, setToken] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const fragmentToken = fragment.get("manage")
    if (fragmentToken) {
      localStorage.setItem(`pet-movie:${projectId}`, fragmentToken)
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
    }
    setToken(fragmentToken || localStorage.getItem(`pet-movie:${projectId}`))
  }, [projectId])

  if (!token) return null

  async function deleteProject() {
    setDeleting(true)
    try {
      const response = await fetch(`/api/pet-life-movie/projects/${projectId}`, {
        method: "DELETE",
        headers: { "x-pet-movie-token": token ?? "" },
      })
      const body = await response.json() as { error?: string }
      if (!response.ok) throw new Error(body.error ?? `Deletion failed (${response.status})`)
      localStorage.removeItem(`pet-movie:${projectId}`)
      toast.success(locale === "ja" ? "写真と動画を完全に削除しました" : "Photos and films were permanently deleted")
      window.location.assign(`/${locale}/pet-life-movie`)
    } catch (error) {
      console.error("[pet-life-movie] deletion failed", error)
      toast.error(error instanceof Error ? error.message : "Deletion failed")
      setDeleting(false)
    }
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6 text-xs text-white/55">
      <span>Private files expire {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(expiresAt))}.</span>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-red-200 hover:bg-red-500/10 hover:text-red-100">
            <Trash2 className="h-4 w-4" aria-hidden="true" />Delete all data now
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete this project?</DialogTitle>
            <DialogDescription>
              Every uploaded photo and delivered movie will be removed from private storage. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" disabled={deleting} onClick={deleteProject}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
