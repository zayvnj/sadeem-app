"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { toast } from "sonner"

interface Story {
  id: string
  user_id: string
  media_url: string
  created_at: string
  users?: {
    id: string
    full_name: string
    username: string
    avatar_url: string
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

    const duration = 5000 // 5 seconds per story
    const interval = 50 // Update every 50ms
    const step = (interval / duration) * 100

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressRef.current!)
          handleNext()
          return 0
        }
        return prev + step
      })
    }, interval)

    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [currentIndex, isPaused])

  // Mark story as viewed
  useEffect(() => {
    const markViewed = async () => {
      const user = auth?.currentUser
      if (!user || !currentStory) return

      try {
        await supabase
          .from("story_views")
          .upsert(
            { story_id: currentStory.id, user_id: user.uid },
            { onConflict: "story_id, user_id" }
          )
      } catch (error) {
        console.error("Error marking story as viewed:", error)
      }
    }

    markViewed()
  }, [currentStory])

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
    }
  }

  const handleTap = (e: React.MouseEvent) => {
    // If clicking on input or button, ignore
    if ((e.target as HTMLElement).closest('form')) return

    const { clientX } = e
    const { innerWidth } = window

    // RTL Layout: Left tap = Next, Right tap = Prev
    if (clientX < innerWidth / 2) {
      handleNext() // Left side
    } else {
      handlePrev() // Right side
    }
  }

  const handlePointerDown = () => setIsPaused(true)
  const handlePointerUp = () => setIsPaused(false)

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || isSending) return

    const user = auth?.currentUser
    if (!user) {
      toast.error("يجب تسجيل الدخول")
      return
    }

    setIsSending(true)
    try {
      // 1. Check if chat exists with this user
      const { data: existingChats, error: chatsError } = await supabase
        .from("chats")
        .select("*")
        .contains("participant_ids", [user.uid, currentStory.user_id])

      let chatId = null

      // We need to find the chat that has EXACTLY these two participants
      const exactChat = existingChats?.find(
        (c) => c.participant_ids.length === 2 &&
               c.participant_ids.includes(user.uid) &&
               c.participant_ids.includes(currentStory.user_id)
      )

      if (exactChat) {
        chatId = exactChat.id
      } else {
        // Create new chat
        const { data: newChat, error: createError } = await supabase
          .from("chats")
          .insert({ participant_ids: [user.uid, currentStory.user_id] })
          .select()
          .single()

        if (createError) throw createError
        chatId = newChat.id
      }

      // 2. Insert message with reply info
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: user.uid,
          content: replyText,
          reply_media_url: currentStory.media_url,
          reply_story_id: currentStory.id
        })

      if (msgError) throw msgError

      toast.success("تم إرسال الرد")
      setReplyText("")
      // Auto resume story after sending
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
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />

      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex gap-1 pt-12">
        {stories.map((s, i) => (
          <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white"
              style={{
                width: i === currentIndex ? `${progress}%` : i < currentIndex ? "100%" : "0%",
                transition: i === currentIndex && !isPaused ? "width 0.1s linear" : "none"
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-16 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-white/20 overflow-hidden">
            {storyUser?.avatar_url ? (
              <img src={storyUser.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              <div className="size-full flex items-center justify-center font-bold">
                {(storyUser?.full_name || storyUser?.username || "م").charAt(0)}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold">{storyUser?.username || storyUser?.full_name}</p>
            <p className="text-xs text-white/70">
              {new Date(currentStory.created_at).toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-black/40 backdrop-blur">
          <X className="size-6" />
        </button>
      </div>

      {/* Media */}
      <div
        className="flex-1 relative flex items-center justify-center bg-zinc-900"
        onClick={handleTap}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          key={currentStory.id}
          src={currentStory.media_url}
          alt="Story"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Footer / Reply Input */}
      {storyUser?.id !== auth?.currentUser?.uid && (
        <form
          onSubmit={handleReply}
          className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10"
        >
          <div className="flex items-center gap-2 max-w-md mx-auto relative">
            <input
              type="text"
              placeholder="إرسال رسالة..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              className="flex-1 bg-white/20 backdrop-blur rounded-full px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/50"
              dir="rtl"
            />
            {replyText.trim() && (
              <button
                type="submit"
                disabled={isSending}
                className="absolute left-2 p-2 rounded-full bg-primary text-white"
              >
                <Send className="size-5 rtl:-scale-x-100" />
              </button>
            )}
          </div>
        </form>
      )}
    </motion.div>
  )
}
