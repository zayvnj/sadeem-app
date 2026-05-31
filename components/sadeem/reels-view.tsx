"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Music2, Play } from "lucide-react"

const reels = [
  { id: 1, user: "@reem", caption: "تمرين الصباح يبدأ بطاقة إيجابية 💪", likes: "٢٤ك", comments: "٣١٠", sound: "صوت أصلي - ريم" },
  { id: 2, user: "@turki", caption: "وصفة سريعة بثلاث مكونات فقط!", likes: "١٨ك", comments: "٤٥٢", sound: "Trending Audio" },
  { id: 3, user: "@jood", caption: "جولة في شوارع المدينة القديمة", likes: "٥٦ك", comments: "١.٢ك", sound: "صوت أصلي - جود" },
]

export function ReelsView() {
  const [localReels, setLocalReels] = useState(
    reels.map(r => ({ ...r, isLiked: false }))
  )

  const [explodingPostId, setExplodingPostId] = useState<number | null>(null)

  const handleLike = (id: number, isDoubleTap = false) => {
    setLocalReels(current =>
      current.map(reel => {
        if (reel.id === id) {
          const wasLiked = reel.isLiked
          if (isDoubleTap && wasLiked) return reel

          const isNowLiked = !wasLiked
          if (isNowLiked) {
             window.dispatchEvent(new CustomEvent('mascot-action', { detail: 'celebrate' }))
          }

          // Since mock likes are strings (like "٢٤ك"), we'll just toggle the heart color for now
          // Real backend integration will handle incrementing/decrementing properly
          return { ...reel, isLiked: isNowLiked }
        }
        return reel
      })
    )
  }

  const handleDoubleTap = (id: number) => {
    handleLike(id, true)

    setExplodingPostId(id)
    setTimeout(() => {
      setExplodingPostId(null)
    }, 800)
  }

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {localReels.map((reel, i) => (
        <motion.section
          key={reel.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          className="relative h-full w-full snap-start snap-always overflow-hidden bg-black select-none"
        >
          {/* Video placeholder / Content Area */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-neutral-900 via-black to-neutral-800 cursor-pointer"
            onDoubleClick={() => handleDoubleTap(reel.id)}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <Play className="size-16 text-white/30 pointer-events-none" fill="currentColor" />
            </motion.div>

            {/* Heart Explosion */}
            <AnimatePresence>
              {explodingPostId === reel.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.5, type: 'spring', damping: 15 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                >
                  <Heart className="size-32 fill-white text-white drop-shadow-2xl" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Overlay gradient */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />

          {/* Right actions */}
          <div className="absolute bottom-24 left-3 flex flex-col items-center gap-6 text-white z-20">
            <ReelAction
              icon={
                <motion.div
                  animate={reel.isLiked ? { scale: [1, 1.2, 1] } : { scale: [1, 0.9, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  <Heart className={`size-7 transition-colors ${reel.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                </motion.div>
              }
              label={reel.likes}
              onClick={() => handleLike(reel.id)}
            />
            <ReelAction icon={<MessageCircle className="size-7" />} label={reel.comments} />
            <ReelAction icon={<Send className="size-7" />} label="مشاركة" />
            <div className="size-9 rounded-md border-2 border-white/80 bg-neutral-700 animate-spin-slow" />
          </div>

          {/* Caption */}
          <div className="absolute bottom-24 right-4 left-20 text-white">
            <p className="text-sm font-bold">{reel.user}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-pretty text-white/90">{reel.caption}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/80">
              <Music2 className="size-4" />
              <span className="truncate">{reel.sound}</span>
            </div>
          </div>
        </motion.section>
      ))}
    </div>
  )
}

function ReelAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.8 }} className="flex flex-col items-center gap-1 drop-shadow-md">
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </motion.button>
  )
}
