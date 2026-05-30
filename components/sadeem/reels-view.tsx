"use client"

import { motion } from "framer-motion"
import { Heart, MessageCircle, Send, Music2, Play } from "lucide-react"

const reels = [
  { id: 1, user: "@reem", caption: "تمرين الصباح يبدأ بطاقة إيجابية 💪", likes: "٢٤ك", comments: "٣١٠", sound: "صوت أصلي - ريم" },
  { id: 2, user: "@turki", caption: "وصفة سريعة بثلاث مكونات فقط!", likes: "١٨ك", comments: "٤٥٢", sound: "Trending Audio" },
  { id: 3, user: "@jood", caption: "جولة في شوارع المدينة القديمة", likes: "٥٦ك", comments: "١.٢ك", sound: "صوت أصلي - جود" },
]

export function ReelsView() {
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
          {/* Video placeholder */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-neutral-900 via-black to-neutral-800">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <Play className="size-16 text-white/30" fill="currentColor" />
            </motion.div>
          </div>

          {/* Overlay gradient */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />

          {/* Right actions */}
          <div className="absolute bottom-24 left-3 flex flex-col items-center gap-6 text-white">
            <ReelAction icon={<Heart className="size-7" />} label={reel.likes} />
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

function ReelAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.button whileTap={{ scale: 0.8 }} className="flex flex-col items-center gap-1">
      {icon}
      <span className="text-xs">{label}</span>
    </motion.button>
  )
}
