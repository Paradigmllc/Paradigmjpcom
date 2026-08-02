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
  const t = locale === "ja"
    ? { expiry: "非公開ファイルの削除予定日", delete: "今すぐ全データを削除", title: "このプロジェクトを完全に削除しますか？", body: "アップロードした写真、完成動画、関連データをprivate storageから削除します。この操作は取り消せません。", cancel: "キャンセル", confirm: "完全に削除", success: "写真と動画を完全に削除しました", failed: "削除できませんでした" }
    : locale === "es"
      ? { expiry: "Los archivos privados caducan", delete: "Eliminar todos los datos", title: "¿Eliminar este proyecto permanentemente?", body: "Se eliminarán las fotos, vídeos y datos relacionados. Esta acción no se puede deshacer.", cancel: "Cancelar", confirm: "Eliminar permanentemente", success: "Las fotos y vídeos se eliminaron", failed: "No se pudo eliminar" }
      : locale === "pt"
        ? { expiry: "Os arquivos privados expiram", delete: "Excluir todos os dados", title: "Excluir este projeto permanentemente?", body: "Fotos, vídeos e dados relacionados serão removidos. Esta ação não pode ser desfeita.", cancel: "Cancelar", confirm: "Excluir permanentemente", success: "Fotos e vídeos foram excluídos", failed: "Não foi possível excluir" }
        : { expiry: "Private files expire", delete: "Delete all data now", title: "Permanently delete this project?", body: "Every uploaded photo, delivered movie, and related record will be removed from private storage. This cannot be undone.", cancel: "Cancel", confirm: "Delete permanently", success: "Photos and films were permanently deleted", failed: "Deletion failed" }

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
      const recent = localStorage.getItem("pet-movie:recent")
      if (recent?.includes(projectId)) localStorage.removeItem("pet-movie:recent")
      toast.success(t.success)
      window.location.assign(`/${locale}/pet-life-movie`)
    } catch (error) {
      console.error("[pet-life-movie] deletion failed", error)
      toast.error(error instanceof Error ? error.message : t.failed)
      setDeleting(false)
    }
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6 text-xs text-white/55">
      <span>{t.expiry}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(expiresAt))}.</span>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-red-200 hover:bg-red-500/10 hover:text-red-100">
            <Trash2 className="h-4 w-4" aria-hidden="true" />{t.delete}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
            <DialogDescription>{t.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t.cancel}</Button></DialogClose>
            <Button variant="destructive" disabled={deleting} onClick={deleteProject}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
