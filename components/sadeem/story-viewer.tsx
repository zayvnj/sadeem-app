"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send } from "lucide-react"
import { useSession } from "next-auth/react"
import { sendMessage } from "@/app/actions/chat"
import { toast } from "sonner"

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
  }, [currentIndex, isPaused, currentStory])

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setProgress(0)
    } else {
      onComplete()
    }
  }

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

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || isSending) return

    if (!currentUser) {
      toast.error("يجب تسجيل الدخول")
      return
    }

    setIsSending(true)
    try {
      const enrichedText = `[REPLY|${currentStory.id}|${currentStory.users?.fullName || currentStory.users?.full_name || 'Story'}|${currentStory.media_url}] ${replyText}`

      const res = await sendMessage(currentStory.user_id, enrichedText)
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
        onClick={handleTap}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
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

      {/* Reply Input */}
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 safe-area-bottom">
        <form onSubmit={handleReply} className="flex items-center gap-3 w-full max-w-md mx-auto">
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
      </div>
    </motion.div>
  )
}
