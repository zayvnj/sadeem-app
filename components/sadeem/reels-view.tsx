"use client"

import { useState, useEffect, useRef, useContext } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Music2, Play, Volume2, VolumeX, Loader2, BadgeCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { NavigationContext } from "./app-shell"

export function ReelsView() {
  const [reels, setReels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReels = async () => {
    try {
      const user = auth?.currentUser

      const { data, error } = await supabase
        .from('posts')
        .select('*, users:user_id(id, full_name, username, avatar_url, is_verified), post_likes(user_id)')
        .not('media_url', 'is', null)
        .eq('type', 'reel')
        .order('created_at', { ascending: false })
        .limit(10)

      // Fallback if 'type' filter fails because column might not be populated or table schema is old
      if (error && error.code !== '42P01') {
          console.error('Reels fetch error:', error)

          // Fallback query matching extensions
          const fallbackQuery = await supabase
            .from('posts')
            .select('*, users:user_id(id, full_name, username, avatar_url, is_verified), post_likes(user_id)')
            .not('media_url', 'is', null)
            .like('media_url', '%.mp4')
            .order('created_at', { ascending: false })
            .limit(10)

            if (!fallbackQuery.error) {
              const formattedReels = (fallbackQuery.data || []).map((reel: any) => formatReel(reel, user))
              setReels(formattedReels)
              return
            }
      } else if (data) {
        const formattedReels = (data || []).map((reel: any) => formatReel(reel, user))
        setReels(formattedReels)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const formatReel = (reel: any, user: any) => {
      const likesCount = reel.post_likes ? reel.post_likes.length : 0
      const isLiked = user ? reel.post_likes?.some((like: any) => like.user_id === user.uid) : false
      return {
        ...reel,
        likes_count: likesCount,
        isLiked
      }
  }

  useEffect(() => {
    fetchReels()
  }, [])

  const handleLike = async (postId: string, isDoubleTap = false) => {
    try {
      const user = auth?.currentUser
      if (!user) {
        alert("يجب تسجيل الدخول للإعجاب")
        return
      }

      const reelIndex = reels.findIndex(r => r.id === postId)
      if (reelIndex === -1) return

      const reel = reels[reelIndex]
      const wasLiked = reel.isLiked

      if (isDoubleTap && wasLiked) return

      const isNowLiked = !wasLiked

      setReels(current =>
        current.map(r => {
          if (r.id === postId) {
            return {
              ...r,
              isLiked: isNowLiked,
              likes_count: isNowLiked ? (r.likes_count || 0) + 1 : Math.max(0, (r.likes_count || 1) - 1)
            }
          }
          return r
        })
      )

      if (isNowLiked) {
        window.dispatchEvent(new CustomEvent('mascot-action', { detail: 'celebrate' }))
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.uid })
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.uid)
        if (error) throw error
      }

    } catch (error) {
      console.error('Error toggling like:', error)
      fetchReels()
    }
  }

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-black">
      {loading ? (
         <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-white" />
         </div>
      ) : reels.length > 0 ? (
        reels.map((reel, i) => (
          <ReelItem key={reel.id} reel={reel} handleLike={handleLike} index={i} />
        ))
      ) : (
        <div className="flex h-full items-center justify-center text-white/70">
          لا توجد فيديوهات (ريلز) حالياً.
        </div>
      )}
    </div>
  )
}

function ReelItem({ reel, handleLike, index }: { reel: any, handleLike: (id: string, isDoubleTap?: boolean) => void, index: number }) {
  const { navigateToProfile } = useContext(NavigationContext)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showPlayIcon, setShowPlayIcon] = useState(false)
  const [exploding, setExploding] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.6, // Play when 60% visible
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (videoRef.current) {
            videoRef.current.play().catch(() => setIsPlaying(false))
            setIsPlaying(true)
          }
        } else {
          if (videoRef.current) {
            videoRef.current.pause()
            setIsPlaying(false)
          }
        }
      })
    }, options)

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      if (containerRef.current) observer.unobserve(containerRef.current)
    }
  }, [])

  const handleVideoTap = (e: React.MouseEvent) => {
    // Basic single tap to play/pause
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)

      setShowPlayIcon(true)
      setTimeout(() => setShowPlayIcon(false), 800)
    }
  }

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent single tap play/pause from firing concurrently if possible, though React synthetic events might need manual debouncing
    handleLike(reel.id, true)

    setExploding(true)
    setTimeout(() => {
      setExploding(false)
    }, 800)
  }

  // Handle single/double tap routing
  const tapTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleTapRouting = (e: React.MouseEvent) => {
    if (tapTimeout.current) {
      // It's a double tap
      clearTimeout(tapTimeout.current)
      tapTimeout.current = null
      handleDoubleTap(e)
    } else {
      // It's a single tap, wait a bit to see if it becomes double
      tapTimeout.current = setTimeout(() => {
        handleVideoTap(e)
        tapTimeout.current = null
      }, 250) // 250ms window for double tap
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const total = videoRef.current.duration
      setProgress((current / total) * 100)
    }
  }

  return (
    <motion.section
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="relative h-full w-full snap-start snap-always overflow-hidden bg-black select-none"
    >
      {/* Video Content Area */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={handleTapRouting}
      >
        <video
           ref={videoRef}
           src={reel.media_url}
           className="h-full w-full object-cover"
           loop
           muted={isMuted}
           playsInline
           onTimeUpdate={handleTimeUpdate}
        />

        {/* Play/Pause momentary icon overlay */}
        <AnimatePresence>
          {showPlayIcon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <div className="rounded-full bg-black/40 p-4 backdrop-blur-sm">
                {!isPlaying ? (
                  <Play className="size-12 text-white fill-white" />
                ) : (
                  <div className="flex gap-2 h-12 w-12 items-center justify-center">
                     <div className="w-3 h-10 bg-white rounded-sm" />
                     <div className="w-3 h-10 bg-white rounded-sm" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Heart Explosion on Double Tap */}
        <AnimatePresence>
          {exploding && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.5, type: 'spring', damping: 15 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <Heart className="size-32 fill-white text-white drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Right actions */}
      <div className="absolute bottom-24 left-3 flex flex-col items-center gap-6 text-white z-30">
        <ReelAction
          icon={
            <motion.div
              animate={reel.isLiked ? { scale: [1, 1.2, 1] } : { scale: [1, 0.9, 1] }}
              transition={{ duration: 0.3 }}
            >
              <Heart className={`size-7 transition-colors ${reel.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            </motion.div>
          }
          label={reel.likes_count?.toString() || "٠"}
          onClick={() => handleLike(reel.id)}
        />
        <ReelAction icon={<MessageCircle className="size-7" />} label={reel.comments_count?.toString() || "٠"} />
        <ReelAction icon={<Send className="size-7" />} label="مشاركة" />
      </div>

      {/* Caption */}
      <div className="absolute bottom-24 right-4 left-20 text-white z-30 flex flex-col gap-2">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button onClick={() => navigateToProfile(reel.user_id)} className="flex items-center gap-2">
            {reel.users?.avatar_url ? (
              <img src={reel.users.avatar_url} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <div className="size-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-xs">
                {(reel.users?.full_name || reel.users?.username || 'م').charAt(0)}
              </div>
            )}
            <p className="text-sm font-bold flex items-center gap-1 drop-shadow-md">
              {reel.users?.full_name || reel.users?.username || `@${reel.user_id?.substring(0,8)}`}
              {reel.users?.is_verified && <BadgeCheck className="size-4 text-blue-400 drop-shadow-sm" />}
            </p>
          </button>
        </div>
        <p className="text-sm leading-relaxed text-pretty text-white/90 drop-shadow-md">{reel.text || reel.caption || ""}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-white/80 drop-shadow-md">
          <Music2 className="size-4" />
          <span className="truncate">الصوت الأصلي</span>
        </div>
      </div>

      {/* Mute/Unmute Toggle */}
      <button
         onClick={() => setIsMuted(!isMuted)}
         className="absolute bottom-32 right-4 z-40 rounded-full bg-black/40 p-2 backdrop-blur-sm text-white"
      >
        {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-40">
        <div
          className="h-full bg-white transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.section>
  )
}

function ReelAction({ icon, label, onClick }: { icon: React.ReactNode; label?: string; onClick?: () => void }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.8 }} className="flex flex-col items-center gap-1 drop-shadow-md">
      {icon}
      {label && <span className="text-xs font-semibold">{label}</span>}
    </motion.button>
  )
}
