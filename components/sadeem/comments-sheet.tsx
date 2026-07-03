import { useEffect, useState, useRef } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Send, Trash2 } from "lucide-react"
import { getComments, addComment, deleteComment } from "@/app/actions/post"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "next-auth/react"
import { useNavigation } from "./navigation-context"
import { useInView } from "react-intersection-observer"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

interface CommentsSheetProps {
  postId: string | null
  postOwnerId: string | null
  isOpen: boolean
  onClose: () => void
}

export function CommentsSheet({ postId, postOwnerId, isOpen, onClose }: CommentsSheetProps) {
  const { data: session } = useSession()
  const { navigateToProfile } = useNavigation()
  const { ref, inView } = useInView()
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState("")

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: async ({ pageParam = undefined }) => {
      if (!postId) return { comments: [], nextCursor: null }
      const res = await getComments(postId, pageParam)
      if (!res.success) throw new Error(res.error)
      return res.data!
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isOpen && !!postId,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const comments = data?.pages.flatMap((page) => page.comments) || []

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!postId) throw new Error("No post ID")
      const res = await addComment(postId, text)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      setNewComment("")
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] }) // to update comment count
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء إضافة التعليق")
    }
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await deleteComment(commentId)
      if (!res.success) throw new Error(res.error)
      return commentId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء حذف التعليق")
    }
  })

  const handleAddComment = () => {
    if (!newComment.trim() || !session?.user) return
    addCommentMutation.mutate(newComment.trim())
  }

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا التعليق؟")) {
      deleteCommentMutation.mutate(commentId)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border flex flex-col p-0">
        <SheetHeader className="p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-xl z-10">
          <SheetTitle className="text-center font-bold">التعليقات</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {status === 'pending' ? (
            <div className="flex justify-center p-4">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : status === 'error' ? (
            <div className="text-center text-muted-foreground p-4">
              حدث خطأ أثناء تحميل التعليقات
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground p-4 h-full flex flex-col items-center justify-center">
              <p className="font-bold text-lg">لا توجد تعليقات حتى الآن</p>
              <p className="text-sm">كن أول من يعلق!</p>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar
                    className="size-10 border border-border cursor-pointer shrink-0"
                    onClick={() => {
                      onClose()
                      navigateToProfile(comment.user.id)
                    }}
                  >
                    <AvatarImage src={comment.user.avatarUrl || ''} />
                    <AvatarFallback>{comment.user.fullName?.[0] || comment.user.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2 items-baseline">
                        <span
                          className="font-bold text-sm cursor-pointer"
                          onClick={() => {
                            onClose()
                            navigateToProfile(comment.user.id)
                          }}
                        >
                          {comment.user.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ar })}
                        </span>
                      </div>

                      {(session?.user?.id === comment.userId || session?.user?.id === postOwnerId) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                          disabled={deleteCommentMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm selectable-text break-words whitespace-pre-wrap">{comment.text}</p>
                  </div>
                </div>
              ))}
              <div ref={ref} className="py-2 flex justify-center">
                {isFetchingNextPage && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
              </div>
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-border bg-background sticky bottom-0 z-10 pb-safe">
          <div className="flex items-center gap-2 bg-secondary rounded-full p-1 pl-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="أضف تعليق..."
              className="flex-1 bg-transparent outline-none text-sm px-2 py-2 placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddComment()
                }
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className={`p-2 rounded-full transition-colors ${
                newComment.trim()
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4 rotate-180" />
              )}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
