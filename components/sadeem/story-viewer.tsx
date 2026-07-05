"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Trash2, Eye } from "lucide-react"
import { useSession } from "next-auth/react"
import { sendMessage } from "@/app/actions/chat"
import { markStoryAsViewed, deleteStory, getStoryViewers } from "@/app/actions/story"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

interface Story {
  id: string
  user_id: string
  media_url: string
  created_at: string
  users?: {
    id: string
    full_name?: string
    fullName?: string
    username: string
    avatar_url?: string
    avatarUrl?: string
  }
}

interface StoryViewerProps {
  stories: Story[]
  initialStoryIndex?: number
  onClose: () => void
  onComplete: () => void
}

export function StoryViewer({ stories, initialStoryIndex = 0, onClose, onComplete }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  const currentStory = stories[currentIndex]
  const queryClient = useQueryClient()

  useEffect(() => {
    if (currentStory) {
      markStoryAsViewed(currentStory.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['feed', 'stories'] })
      }).catch(console.error)
    }
  }, [currentStory, queryClient])

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setProgress(0)
    } else {
      onComplete()
    }
  }

  // Start/Resume progress
  useEffect(() => {
    if (isPaused) {
      if (progressRef.current) clearInterval(progressRef.current)
      return
    }

    const duration = currentStory?.media_url?.match(/\.(mp4|webm|ogg)$/i) ? 15000 : 5000 // 15s for video, 5s for images
    const interval = 50
    const step = (interval / duration) * 100

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressRef.current!)
          handleNext()
          return 100
        }
        return prev + step
      })
    }, interval)

    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isPaused, currentStory])

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setProgress(0)
    } else {
      setProgress(0)
    }
  }

  // Tap navigation for RTL (Left = Next, Right = Prev)
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    // If clicking on input or button, ignore
    if ((e.target as HTMLElement).closest('form')) return

    const x = e.clientX
    const width = window.innerWidth

    if (x < width * 0.3) {
      // Tapped left side -> Next Story (RTL)
      handleNext()
    } else if (x > width * 0.7) {
      // Tapped right side -> Prev Story (RTL)
      handlePrev()
    }
  }

  const handlePointerDown = () => setIsPaused(true)
  const handlePointerUp = () => setIsPaused(false)

  const { data: session } = useSession()
  const currentUser = session?.user

  const [isDeleting, setIsDeleting] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [viewers, setViewers] = useState<any[]>([])
  const isOwner = currentUser?.id === currentStory?.user_id || currentUser?.id === (currentStory as any)?.userId

  useEffect(() => {
    if (isOwner && currentStory) {
      getStoryViewers(currentStory.id).then(res => {
        if (res.success && res.data) {
          setViewers(res.data)
        }
      })
    }
  }, [isOwner, currentStory])

  const handleDelete = async () => {
    if (confirm("هل أنت متأكد من حذف هذه القصة؟")) {
      setIsDeleting(true)
      try {
        const res = await deleteStory(currentStory.id)
        if (res.success) {
          toast.success("تم حذف القصة")
          queryClient.invalidateQueries({ queryKey: ['feed', 'stories'] })
          handleNext()
        } else {
          toast.error("فشل في حذف القصة")
        }
      } catch (e) {
        toast.error("حدث خطأ")
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || isSending) return

    if (!currentUser) {
      toast.error("يجب تسجيل الدخول")
      return
    }

    setIsSending(true)
    try {
      const targetUserId = currentStory.user_id || (currentStory as any).userId
      if (!targetUserId) {
        toast.error("حدث خطأ: لا يمكن العثور على صاحب القصة")
        setIsSending(false)
        return
      }

      const enrichedText = `[REPLY|${currentStory.id}|${currentStory.users?.fullName || currentStory.users?.full_name || 'Story'}|${currentStory.media_url}] ${replyText}`

      const res = await sendMessage(targetUserId, enrichedText)
      if (!res.success) throw new Error(res.error)

      toast.success("تم إرسال الرد")
      setReplyText("")
      setIsPaused(false)

    } catch (error) {
      console.error("Error sending reply:", error)
      toast.error("حدث خطأ أثناء الإرسال")
    } finally {
      setIsSending(false)
    }
  }

  if (!currentStory) return null

  const storyUser = currentStory.users

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
    >
      {/* Dark gradient for Header visibility */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />

      {/* Progress Bars */}
      <div className="absolute top-2 inset-x-2 z-20 flex gap-1 safe-area-top">
        {stories.map((story, idx) => (
          <div key={story.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: "0%" }}
              animate={{
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? "100%" : "0%",
              }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 inset-x-4 z-20 flex items-center justify-between safe-area-top mt-2">
        <div className="flex items-center gap-3 drop-shadow-md">
          <div className="size-10 rounded-full bg-secondary overflow-hidden border border-white/20 shrink-0">
             {storyUser?.avatar_url || storyUser?.avatarUrl ? (
               <img src={storyUser.avatar_url || storyUser.avatarUrl} alt="" className="size-full object-cover" />
             ) : (
               <div className="size-full bg-zinc-800 flex items-center justify-center font-bold text-white">
                 {(storyUser?.full_name || storyUser?.fullName || storyUser?.username || "م").charAt(0)}
               </div>
             )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none tracking-wide text-white drop-shadow-lg">
              {storyUser?.full_name || storyUser?.fullName || storyUser?.username}
            </span>
            <span className="text-[10px] text-white/80 mt-1 font-medium drop-shadow-md">
              {new Date(currentStory.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button onClick={() => setIsPaused(!isPaused)} className="p-2 bg-black/20 rounded-full backdrop-blur-sm transition-colors hover:bg-black/40">
             {/* Pause/Play icon can be added here if needed */}
             <div className="flex gap-0.5">
               <div className="w-1 h-3 bg-white rounded-full" />
               <div className="w-1 h-3 bg-white rounded-full" />
             </div>
           </button>
           <button onClick={onClose} className="p-2 bg-black/20 rounded-full backdrop-blur-sm transition-colors hover:bg-black/40">
             <X className="size-5" />
           </button>
        </div>
      </div>

      {/* Media Content */}
      <div
        className="flex-1 relative bg-zinc-900 flex items-center justify-center overflow-hidden"
        onClick={(e) => {
          if (!showViewers) handleTap(e)
        }}
        onPointerDown={() => {
          if (!showViewers) handlePointerDown()
        }}
        onPointerUp={() => {
          if (!showViewers) handlePointerUp()
        }}
        onPointerLeave={() => {
          if (!showViewers) handlePointerUp()
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStory.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 size-full"
          >
            {currentStory.media_url?.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                src={currentStory.media_url}
                className="size-full object-cover"
                autoPlay
                playsInline
                muted={false} // Allow audio if unmuted
              />
            ) : (
              <img src={currentStory.media_url} alt="Story" className="size-full object-cover" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer (Reply Input or Owner Actions) */}
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 safe-area-bottom flex flex-col justify-end pointer-events-none">
        <div className="w-full max-w-md mx-auto pointer-events-auto">
          {isOwner ? (
            <div className="flex items-center justify-between gap-4 mt-auto">
              <button
                onClick={() => {
                  setShowViewers(true);
                  setIsPaused(true);
                }}
                className="flex items-center gap-2 text-white bg-black/40 px-4 py-2 rounded-full backdrop-blur-md hover:bg-black/60 transition-colors"
              >
                <Eye className="size-5" />
                <span className="font-bold">{viewers.length}</span>
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 text-red-500 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md hover:bg-black/60 transition-colors disabled:opacity-50"
              >
                <Trash2 className="size-5" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleReply} className="flex items-center gap-3 w-full">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="إرسال رسالة..."
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                className="flex-1 rounded-full border border-white/30 bg-black/40 px-5 py-3.5 text-sm text-white backdrop-blur-md outline-none placeholder:text-white/60 focus:border-white focus:bg-black/60 transition-all"
                dir="auto"
              />
              <AnimatePresence>
                {replyText.trim() && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    type="submit"
                    disabled={isSending}
                    className="size-12 rounded-full bg-white flex items-center justify-center text-black shadow-lg disabled:opacity-50 shrink-0"
                  >
                    {isSending ? <span className="size-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Send className="size-5 -ml-1" />}
                  </motion.button>
                )}
              </AnimatePresence>
            </form>
          )}
        </div>
      </div>

      {/* Viewers Modal */}
      <AnimatePresence>
        {showViewers && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-x-0 bottom-0 top-1/3 bg-background rounded-t-3xl z-50 flex flex-col shadow-2xl border-t border-border"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold flex items-center gap-2">
                <Eye className="size-5 text-muted-foreground" />
                المشاهدات ({viewers.length})
              </h3>
              <button
                onClick={() => {
                  setShowViewers(false);
                  setIsPaused(false);
                }}
                className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {viewers.length > 0 ? (
                viewers.map((view) => (
                  <div key={view.id} className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-secondary overflow-hidden">
                      {view.user.avatarUrl ? (
                        <img src={view.user.avatarUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="size-full flex items-center justify-center font-bold">
                          {(view.user.fullName || view.user.username).charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm leading-none">{view.user.fullName || view.user.username}</span>
                      <span className="text-xs text-muted-foreground">@{view.user.username}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mr-auto">
                      {new Date(view.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  لا توجد مشاهدات حتى الآن
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
