"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Music2, Play, Volume2, VolumeX, Loader2, BadgeCheck, Film } from "lucide-react"
import { useSession } from "next-auth/react"
import { getReels, toggleLike, toggleSave } from "@/app/actions/post"
import { useNavigation } from "./navigation-context"
import { LikesSheet } from "./likes-sheet"
import { CommentsSheet } from "./comments-sheet"
import { Bookmark, MoreHorizontal } from "lucide-react"
import { PostOptionsSheet } from "./post-options-sheet"

export function ReelsView() {
  const [reels, setReels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { setSelectedUserId } = useNavigation()
  const { data: session } = useSession()
  const currentUser = session?.user

  useEffect(() => {
    const fetchReelsData = async () => {
      try {
        const res = await getReels()
        if (res.success && res.data) {
          // Map to expected UI structure
          const formattedReels = res.data.map(reel => ({
            ...reel,
            users: reel.user,
            likes_count: reel.likesCount,
            comments_count: reel.commentsCount,
          }))
          setReels(formattedReels)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchReelsData()
  }, [])

  const handleLike = async (postId: string, isDoubleTap = false) => {
    try {
      if (!currentUser) {
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
      }

      const res = await toggleLike(postId)
      if (!res.success) throw new Error(res.error)

    } catch (error) {
      console.error('Like error:', error)
      // Reset state on error handled via typical react query mechanisms in real app, here simple refetch logic could be used
    }
  }

  const handleSave = async (postId: string) => {
    try {
      if (!currentUser) {
        alert("يجب تسجيل الدخول للحفظ")
        return
      }

      const reelIndex = reels.findIndex(r => r.id === postId)
      if (reelIndex === -1) return

      const reel = reels[reelIndex]
      const wasSaved = reel.isSaved
      const isNowSaved = !wasSaved

      setReels(current =>
        current.map(r => {
          if (r.id === postId) {
            return {
              ...r,
              isSaved: isNowSaved,
            }
          }
          return r
        })
      )

      const res = await toggleSave(postId)
      if (!res.success) throw new Error(res.error)
    } catch (error) {
      console.error(error)
    }
  }

  // Basic scroll snap logic for reels
  const [activeReelIndex, setActiveReelIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Modals state
  const [activeLikesPostId, setActiveLikesPostId] = useState<string | null>(null)
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null)
  const [activeCommentsPostOwnerId, setActiveCommentsPostOwnerId] = useState<string | null>(null)
  const [activeOptionsPost, setActiveOptionsPost] = useState<any | null>(null)

  const handleScroll = () => {
    if (!containerRef.current) return
    const scrollPosition = containerRef.current.scrollTop
    const windowHeight = window.innerHeight
    const newIndex = Math.round(scrollPosition / windowHeight)
    if (newIndex !== activeReelIndex) {
      setActiveReelIndex(newIndex)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black">
        <Loader2 className="size-8 animate-spin text-white/50" />
      </div>
    )
  }

  if (reels.length === 0) {
     return (
       <div className="flex flex-col items-center justify-center h-full bg-black text-white px-6 text-center">
          <div className="size-20 rounded-full bg-white/10 flex items-center justify-center mb-6 border border-white/20">
            <Film className="size-10 text-white/60" />
          </div>
          <p className="text-lg font-bold mb-2">لا توجد مقاطع ريلز حالياً</p>
          <p className="text-white/60 text-sm max-w-[250px]">سوف تظهر مقاطع الفيديو القصيرة هنا عند نشرها من قبل الأشخاص الذين تتابعهم أو الحسابات العامة.</p>
       </div>
     )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full w-full bg-black overflow-y-auto snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {reels.map((reel, index) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          isActive={index === activeReelIndex}
          onLike={handleLike}
          onSave={handleSave}
          onShowLikes={() => setActiveLikesPostId(reel.id)}
          onShowComments={() => {
            setActiveCommentsPostId(reel.id)
            setActiveCommentsPostOwnerId(reel.user_id)
          }}
          onShowOptions={() => setActiveOptionsPost(reel)}
          onAvatarClick={(uid) => setSelectedUserId(uid)}
        />
      ))}

      <LikesSheet
        postId={activeLikesPostId}
        isOpen={!!activeLikesPostId}
        onClose={() => setActiveLikesPostId(null)}
      />

      <CommentsSheet
        postId={activeCommentsPostId}
        postOwnerId={activeCommentsPostOwnerId}
        isOpen={!!activeCommentsPostId}
        onClose={() => {
          setActiveCommentsPostId(null)
          setActiveCommentsPostOwnerId(null)
        }}
      />

      <PostOptionsSheet
        post={activeOptionsPost}
        isOpen={!!activeOptionsPost}
        onClose={() => setActiveOptionsPost(null)}
      />
    </div>
  )
}

function ReelItem({ reel, isActive, onLike, onSave, onShowLikes, onShowComments, onShowOptions, onAvatarClick }: { reel: any; isActive: boolean; onLike: (id: string, dt?: boolean) => void; onSave: (id: string) => void; onShowLikes: () => void; onShowComments: () => void; onShowOptions: () => void; onAvatarClick: (uid: string) => void }) {
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showHeart, setShowHeart] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const user = reel.users

  useEffect(() => {
    if (!videoRef.current) return
    if (isActive && isPlaying) {
      videoRef.current.play().catch(() => setIsPlaying(false))
    } else {
      videoRef.current.pause()
    }
  }, [isActive, isPlaying])

  const handleDoubleTap = () => {
    onLike(reel.id, true)
    setShowHeart(true)
    setTimeout(() => setShowHeart(false), 800)
  }

  const togglePlay = () => setIsPlaying(!isPlaying)

  return (
    <div className="relative h-full w-full snap-start snap-always bg-secondary flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      {reel.media_url && reel.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
        <video
          ref={videoRef}
          src={reel.media_url}
          className="absolute inset-0 size-full object-cover"
          loop
          muted={isMuted}
          playsInline
        />
      ) : reel.media_url ? (
         <img src={reel.media_url} className="absolute inset-0 size-full object-cover" alt="" />
      ) : (
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />

      {/* Play/Pause Area */}
      <div className="absolute inset-0 z-10" onClick={togglePlay} onDoubleClick={handleDoubleTap}>
        <AnimatePresence>
          {!isPlaying && (
             <motion.div
               initial={{ opacity: 0, scale: 0.5 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 1.5 }}
               className="absolute inset-0 flex items-center justify-center pointer-events-none"
             >
               <div className="size-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                 <Play className="size-8 text-white ml-1 fill-white" />
               </div>
             </motion.div>
          )}
          {showHeart && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
              animate={{ opacity: 1, scale: 1.5, rotate: 0 }}
              exit={{ opacity: 0, scale: 2, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, type: 'spring', damping: 12 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="size-32 text-red-500 drop-shadow-2xl fill-red-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Header controls */}
      <div className="absolute top-4 inset-x-4 z-20 flex justify-between items-center text-white">
        <h2 className="font-bold text-lg drop-shadow-md">ريلز</h2>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-6 left-4 right-16 z-20 text-white">
        <button className="flex items-center gap-2 mb-3 group text-right" onClick={(e) => { e.stopPropagation(); onAvatarClick(user?.id); }}>
          <div className="size-10 rounded-full bg-white/20 overflow-hidden border border-white/40 backdrop-blur-sm shrink-0">
             {user?.avatar_url ? (
               <img src={user.avatar_url} alt="" className="size-full object-cover" />
             ) : (
               <div className="flex size-full items-center justify-center font-bold text-white">
                 {(user?.full_name || user?.username || "م").charAt(0)}
               </div>
             )}
          </div>
          <div className="flex flex-col drop-shadow-md overflow-hidden min-w-0 pr-1">
             <span className="font-bold text-[15px] leading-none flex items-center gap-1 group-hover:underline">
               {user?.username || user?.full_name}
               {user?.is_verified && <BadgeCheck className="size-3.5 text-blue-400" />}
             </span>
          </div>
          <button className="mr-2 rounded-full border border-white/50 px-3 py-1 text-[11px] font-bold backdrop-blur-sm transition-colors hover:bg-white/20">
            متابعة
          </button>
        </button>

        {reel.text && (
          <p className="text-sm font-medium leading-snug opacity-90 mb-3 drop-shadow-md line-clamp-3 overflow-hidden text-ellipsis w-full max-w-[85%] pr-1 selectable-text">
            {reel.text}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs opacity-90 drop-shadow-md bg-black/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
          <Music2 className="size-3" />
          <span className="truncate max-w-[150px]">الصوت الأصلي - {user?.username || "سديم"}</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="absolute bottom-6 right-2 z-20 flex flex-col gap-5 items-center pb-2">
        <ReelAction
          icon={<Heart className={`size-7 ${reel.isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />}
          label={reel.likes_count?.toString() || "0"}
          onPointerDown={(e) => {
            e.stopPropagation();
            (window as any)._likesPressTimer = setTimeout(() => {
              onShowLikes();
              (window as any)._likesPressTimer = null;
            }, 500);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            if ((window as any)._likesPressTimer) {
              clearTimeout((window as any)._likesPressTimer);
              (window as any)._likesPressTimer = null;
              onLike(reel.id);
            }
          }}
          onPointerLeave={() => {
            if ((window as any)._likesPressTimer) {
              clearTimeout((window as any)._likesPressTimer);
              (window as any)._likesPressTimer = null;
            }
          }}
          animated={reel.isLiked}
        />
        <ReelAction
          icon={<MessageCircle className="size-7 text-white" />}
          label={reel.comments_count?.toString() || "0"}
          onClick={(e) => { e.stopPropagation(); onShowComments(); }}
        />
        <ReelAction
          icon={<Send className="size-7 text-white -ml-1" />}
          label="مشاركة"
          onClick={(e) => {
             e.stopPropagation();
             navigator.clipboard.writeText(window.location.href);
             alert("تم النسخ للمشاركة");
          }}
        />
        <ReelAction
          icon={<Bookmark className={`size-7 ${reel.isSaved ? 'fill-white text-white' : 'text-white'}`} />}
          onClick={(e) => { e.stopPropagation(); onSave(reel.id); }}
        />
        <div className="h-px w-6 bg-white/20 my-1" />
        <button
           onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted) }}
           className="size-10 rounded-full bg-black/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-2"
        >
          {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
        <button
           onClick={(e) => { e.stopPropagation(); onShowOptions() }}
           className="size-10 rounded-full bg-black/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
        >
          <MoreHorizontal className="size-5" />
        </button>
      </div>
    </div>
  )
}

function ReelAction({ icon, label, onClick, onPointerDown, onPointerUp, onPointerLeave, animated }: { icon: React.ReactNode; label?: string; onClick?: (e:any) => void; onPointerDown?: (e:any) => void; onPointerUp?: (e:any) => void; onPointerLeave?: (e:any) => void; animated?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      className="flex flex-col items-center gap-1 drop-shadow-xl touch-none"
    >
      <motion.div
        animate={animated ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        {icon}
      </motion.div>
      <span className="text-xs font-bold text-white">{label}</span>
    </motion.button>
  )
}
