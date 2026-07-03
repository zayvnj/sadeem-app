import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Trash2, UserMinus, Flag, AlertCircle } from "lucide-react"
import { deletePost } from "@/app/actions/post"
import { toggleFollow } from "@/app/actions/user"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

interface PostOptionsSheetProps {
  post: any | null
  isOpen: boolean
  onClose: () => void
}

export function PostOptionsSheet({ post, isOpen, onClose }: PostOptionsSheetProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const isOwner = session?.user?.id === post?.user_id

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      if (!post) throw new Error("No post")
      const res = await deletePost(post.id)
      if (!res.success) throw new Error(res.error)
      return post.id
    },
    onSuccess: () => {
      toast.success("تم حذف المنشور بنجاح")
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['reels'] })
      queryClient.invalidateQueries({ queryKey: ['user', post?.user_id] })
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء حذف المنشور")
    }
  })

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!post) throw new Error("No post")
      const res = await toggleFollow(post.user_id)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      toast.success("تم التحديث")
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['userContext'] })
      onClose()
    },
    onError: (err: any) => {
      toast.error("حدث خطأ أثناء إلغاء المتابعة")
    }
  })

  const handleDelete = () => {
    if (window.confirm("هل أنت متأكد من حذف هذا المنشور بشكل نهائي؟")) {
      deletePostMutation.mutate()
    }
  }

  const handleUnfollow = () => {
    if (window.confirm("هل تريد إلغاء متابعة هذا الحساب؟")) {
      unfollowMutation.mutate()
    }
  }

  const handleReport = () => {
    toast.success("تم الإبلاغ عن المنشور للمراجعة")
    onClose()
  }

  if (!post) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border flex flex-col p-4 pb-safe gap-2">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />

        {isOwner ? (
          <button
            onClick={handleDelete}
            disabled={deletePostMutation.isPending}
            className="flex items-center gap-3 w-full p-4 text-red-500 font-bold bg-secondary rounded-xl active:opacity-70 transition-opacity"
          >
            {deletePostMutation.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Trash2 className="size-5" />
            )}
            حذف المنشور
          </button>
        ) : (
          <>
            <button
              onClick={handleUnfollow}
              disabled={unfollowMutation.isPending}
              className="flex items-center gap-3 w-full p-4 font-bold bg-secondary rounded-xl active:opacity-70 transition-opacity"
            >
              {unfollowMutation.isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <UserMinus className="size-5" />
              )}
              إلغاء المتابعة
            </button>

            <button
              onClick={handleReport}
              className="flex items-center gap-3 w-full p-4 text-red-500 font-bold bg-secondary rounded-xl active:opacity-70 transition-opacity"
            >
              <AlertCircle className="size-5" />
              الإبلاغ عن هذا المنشور
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
