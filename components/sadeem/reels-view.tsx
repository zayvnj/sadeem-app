"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Music2, Play, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { auth } from "../../lib/firebase"

type Reel = {
  id: string
  user_id: string
  user_name: string
  user_handle: string
  caption: string
  video_url: string | null
  likes: number
  comments: number
  sound: string
}

type Comment = {
  id: string
  post_id: string
  user_name: string
  text: string
  created_at: string
}

export function ReelsView() {
  const [reels, setReels] = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)

  const [activeCommentReel, setActiveCommentReel] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newCommentText, setNewCommentText] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const { data, error } = await supabase
          .from("reels")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) throw error; if (data) setReels(data)
      } catch (error) {
        console.error("Error fetching reels:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReels()
  }, [])

  const handleLike = async (reelId: string, currentLikes: number) => {
    const user = auth.currentUser
    if (!user) return

    try {
      setReels(reels.map(r => r.id === reelId ? { ...r, likes: currentLikes + 1 } : r))

      const { error: updateError } = await supabase
        .from("reels")
        .update({ likes: currentLikes + 1 })
        .eq("id", reelId)

      if (updateError) throw updateError
    } catch (err) {
      setReels(reels.map(r => r.id === reelId ? { ...r, likes: currentLikes } : r))
    }
  }

  const openComments = async (reelId: string) => {
    setActiveCommentReel(reelId)
    setLoadingComments(true)
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", reelId)
        .order("created_at", { ascending: true })

      if (error && error.code !== '42P01') throw error
      if (data) {
        setComments(prev => ({ ...prev, [reelId]: data }))
      }
    } catch (err) {
      console.error("Error fetching comments:", err)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCommentReel || !newCommentText.trim()) return

    const user = auth.currentUser
    if (!user) return

    const userName = user.displayName || "مستخدم"

    try {
       const newComment = {
         post_id: activeCommentReel,
         user_name: userName,
         text: newCommentText
       }

       const { data, error } = await supabase
         .from("comments")
         .insert(newComment)
         .select()
         .single()

       if (error) throw error

       if (data) {
         setComments(prev => ({
           ...prev,
           [activeCommentReel]: [...(prev[activeCommentReel] || []), data]
         }))
         setNewCommentText("")

         const reel = reels.find(r => r.id === activeCommentReel)
         if (reel) {
           await supabase.from("reels").update({ comments: reel.comments + 1 }).eq("id", reel.id)
           setReels(reels.map(r => r.id === reel.id ? { ...r, comments: r.comments + 1 } : r))
         }
       }
    } catch (err) {
       console.error("Error adding comment:", err)
    }
  }

  const handleShare = async (text: string, url: string | null) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ريلز سديم',
          text: text,
          url: url || window.location.href,
        })
      } catch (err) {
        console.error("Error sharing:", err)
      }
    } else {
      navigator.clipboard.writeText(url || window.location.href)
      alert("تم نسخ الرابط للمشاركة!")
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-black">
      <div className="size-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
    </div>
  }

  if (reels.length === 0) {
    return <div className="flex h-full items-center justify-center bg-black">
      <p className="text-white/80">لا توجد مقاطع ريلز حالياً</p>
    </div>
  }

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {reels.map((reel, i) => (
        <motion.section
          key={reel.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          className="relative h-full w-full snap-start snap-always overflow-hidden bg-black"
        >
          {/* Video / Placeholder */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-neutral-900 via-black to-neutral-800">
            {reel.video_url ? (
               <video src={reel.video_url} className="size-full object-cover" loop muted autoPlay playsInline />
            ) : (
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              >
                <Play className="size-16 text-white/30" fill="currentColor" />
              </motion.div>
            )}
          </div>

          {/* Overlay gradient */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

          {/* Right actions */}
          <div className="absolute bottom-24 left-3 flex flex-col items-center gap-6 text-white z-10">
            <ReelAction
              icon={<Heart className="size-7" />}
              label={reel.likes.toString()}
              onClick={() => handleLike(reel.id, reel.likes)}
            />
            <ReelAction
              icon={<MessageCircle className="size-7" />}
              label={reel.comments.toString()}
              onClick={() => openComments(reel.id)}
            />
            <ReelAction
              icon={<Send className="size-7" />}
              label="مشاركة"
              onClick={() => handleShare(reel.caption, reel.video_url)}
            />
            <div className="size-9 rounded-md border-2 border-white/80 bg-neutral-700 animate-spin-slow" />
          </div>

          {/* Caption */}
          <div className="absolute bottom-24 right-4 left-20 text-white z-10">
            <p className="text-sm font-bold">{reel.user_name} <span className="font-normal opacity-70 ml-2">{reel.user_handle}</span></p>
            <p className="mt-1.5 text-sm leading-relaxed text-pretty text-white/90">{reel.caption}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/80">
              <Music2 className="size-4" />
              <span className="truncate">{reel.sound || "صوت أصلي"}</span>
            </div>
          </div>
        </motion.section>
      ))}

      {/* Comments Modal Overlay */}
      <AnimatePresence>
        {activeCommentReel && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-0 z-50 bg-background flex flex-col"
          >
             <div className="flex items-center justify-between p-4 border-b border-border bg-card">
               <h3 className="font-bold text-foreground">التعليقات</h3>
               <button onClick={() => setActiveCommentReel(null)} className="p-1 rounded-full hover:bg-muted">
                 <X className="size-5 text-foreground" />
               </button>
             </div>

             <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
               {loadingComments ? (
                 <div className="flex justify-center py-8">
                   <div className="size-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                 </div>
               ) : (comments[activeCommentReel] || []).length > 0 ? (
                 (comments[activeCommentReel] || []).map(comment => (
                   <div key={comment.id} className="flex gap-3">
                     <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                       {comment.user_name.charAt(0)}
                     </div>
                     <div className="flex-1 text-foreground">
                       <p className="text-sm font-bold">{comment.user_name}</p>
                       <p className="text-sm text-muted-foreground">{comment.text}</p>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-8 text-sm text-muted-foreground">لا توجد تعليقات بعد. كن أول من يعلق!</div>
               )}
             </div>

             <div className="p-4 border-t border-border bg-card">
               <form onSubmit={handleAddComment} className="flex gap-2">
                 <input
                   type="text"
                   value={newCommentText}
                   onChange={(e) => setNewCommentText(e.target.value)}
                   placeholder="اكتب تعليقاً..."
                   className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:border-foreground"
                 />
                 <button
                   type="submit"
                   disabled={!newCommentText.trim()}
                   className="flex items-center justify-center px-4 rounded-full bg-foreground text-background font-semibold text-sm disabled:opacity-50"
                 >
                   إرسال
                 </button>
               </form>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ReelAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.8 }} className="flex flex-col items-center gap-1">
      {icon}
      <span className="text-xs">{label}</span>
    </motion.button>
  )
}
