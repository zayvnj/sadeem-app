"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, ChevronRight, ChevronLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { toast } from "sonner"
import { useNavigation } from "./navigation-context"

interface StoryViewerProps {
  stories: any[]
  initialIndex: number
  onClose: () => void
  onStoryViewed: (storyId: string) => void
}

export function StoryViewer({ stories, initialIndex, onClose, onStoryViewed }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [replyText, setReplyText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const storyDuration = 5000 // 5 seconds per story
  const startTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const { setSelectedUserId } = useNavigation()

  const currentStory = stories[currentIndex]

  // Track view when story changes
  useEffect(() => {
    if (!currentStory) return
    const trackView = async () => {
      const user = auth?.currentUser
      if (!user) return

      // Notify parent to update local state
      onStoryViewed(currentStory.id)

      // Only track if it's not the user's own story
      if (currentStory.user_id === user.uid) return

      const { error } = await supabase.from('story_views').insert({
        story_id: currentStory.id,
        viewer_id: user.uid
      })
      if (error && error.code !== '23505') {
         console.error('Error tracking view:', error)
      }
    }
    trackView()
  }, [currentIndex, currentStory, onStoryViewed])

  // Progress animation
  useEffect(() => {
    setProgress(0)
    startTimeRef.current = performance.now()

    const animateProgress = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const newProgress = (elapsed / storyDuration) * 100

      if (newProgress >= 100) {
        handleNext()
      } else {
        setProgress(newProgress)
        animationFrameRef.current = requestAnimationFrame(animateProgress)
      }
    }

    // Only animate if not typing reply
    if (!replyText) {
       animationFrameRef.current = requestAnimationFrame(animateProgress)
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [currentIndex, replyText])

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    } else {
      setProgress(0)
      startTimeRef.current = performance.now()
    }
  }

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !currentStory || isSending) return

    const user = auth?.currentUser
    if (!user) {
      toast.error("يجب تسجيل الدخول للرد")
      return
    }

    setIsSending(true)
    const textToSend = replyText
    setReplyText("") // Clear input immediately

    // Resume progress
    startTimeRef.current = performance.now() - (progress / 100) * storyDuration;

    try {
      // Find existing chat or create new one
      let chatId = null
      const participantIds = [user.uid, currentStory.user_id].sort()

      const { data: existingChats, error: chatError } = await supabase
        .from('chats')
        .select('id, participant_ids')
        .contains('participant_ids', [user.uid])

      if (existingChats) {
         const match = existingChats.find(c =>
            c.participant_ids.length === 2 &&
            c.participant_ids.includes(user.uid) &&
            c.participant_ids.includes(currentStory.user_id)
         )
         if (match) chatId = match.id
      }

      if (!chatId) {
        const { data: newChat, error: newChatError } = await supabase
          .from('chats')
          .insert({ participant_ids: participantIds })
          .select('id')
          .single()

        if (newChatError) throw newChatError
        chatId = newChat.id
      }

      // Send message
      const { error: msgError } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.uid,
        content: textToSend,
        reply_story_id: currentStory.id,
        reply_media_url: currentStory.media_url
      })

      if (msgError) throw msgError

      toast.success("تم إرسال الرد بنجاح", { position: "top-center" })

    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error("حدث خطأ أثناء الإرسال")
    } finally {
      setIsSending(false)
    }
  }

  if (!currentStory) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.y > 100) onClose()
      }}
    >
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 bg-gradient-to-b from-black/60 to-transparent">
        {stories.map((s, i) => (
          <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white"
              style={{
                width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
                transition: i === currentIndex && !replyText ? "width 0.1s linear" : "none"
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
        <div
           className="flex items-center gap-2 cursor-pointer"
           onClick={() => {
              onClose()
              setSelectedUserId(currentStory.user_id)
           }}
        >
          {currentStory.users?.avatar_url ? (
            <img src={currentStory.users.avatar_url} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <div className="size-8 rounded-full bg-white/20 flex items-center justify-center font-semibold text-white">
              {(currentStory.users?.full_name || currentStory.users?.username || 'م').charAt(0)}
            </div>
          )}
          <span className="text-white font-medium drop-shadow-md">
            {currentStory.users?.full_name || currentStory.users?.username}
          </span>
          <span className="text-white/70 text-xs drop-shadow-md">
            {new Date(currentStory.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <button onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors">
          <X className="size-6 drop-shadow-md" />
        </button>
      </div>

      {/* Media */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
         {currentStory.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
            <video
               src={currentStory.media_url}
               autoPlay
               playsInline
               muted
               loop
               className="w-full h-full object-cover"
            />
         ) : (
            <img
               src={currentStory.media_url}
               alt="Story"
               className="w-full h-full object-cover"
            />
         )}

         {/* Navigation Overlay */}
         <div className="absolute inset-0 z-10 flex">
            <div className="flex-1" onClick={handlePrev} />
            <div className="flex-[2]" onClick={handleNext} />
         </div>
      </div>

      {/* Reply Section */}
      {currentStory.user_id !== auth?.currentUser?.uid && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <form onSubmit={handleReplySubmit} className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="رد على القصة..."
              className="flex-1 bg-white/20 border border-white/30 rounded-full px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:bg-white/30 transition-colors backdrop-blur-md"
              onFocus={() => {
                 if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
              }}
              onBlur={() => {
                 if (!replyText) {
                    startTimeRef.current = performance.now() - (progress / 100) * storyDuration;
                 }
              }}
            />
            <AnimatePresence>
              {replyText && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  type="submit"
                  disabled={isSending}
                  className="bg-white text-black p-3 rounded-full flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="size-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </form>
        </div>
      )}
    </motion.div>
  )
}
