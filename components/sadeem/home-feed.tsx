"use client"

import { motion } from "framer-motion"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react"

const stories = ["قصتك", "نورة", "سالم", "ليان", "تركي", "جود", "ريم"]

const posts = [
  {
    id: 1,
    user: "نورة الشمري",
    handle: "@noura",
    time: "منذ ٢ ساعة",
    text: "غروب اليوم كان كأنه لوحة مرسومة باليد. سديم يجمعنا تحت سماء واحدة.",
    likes: "١٢٤",
    comments: "١٨",
  },
  {
    id: 2,
    user: "سالم العتيبي",
    handle: "@salem",
    time: "منذ ٥ ساعات",
    text: "بدأت مشروعي الجديد اليوم. الطريق طويل لكن الخطوة الأولى أهم خطوة.",
    likes: "٣٤٠",
    comments: "٤٢",
  },
  {
    id: 3,
    user: "ليان الحربي",
    handle: "@layan",
    time: "أمس",
    text: "قهوة الصباح + كتاب جيد = يوم مثالي.",
    likes: "٨٩",
    comments: "٧",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 26 } },
}

export function HomeFeed() {
  return (
    <div className="pb-4">
      {/* Stories */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex gap-4 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {stories.map((name, i) => (
          <motion.div key={name} variants={item} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="rounded-full p-[2px] ring-2 ring-foreground">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                {name.charAt(0)}
              </div>
            </div>
            <span className="text-xs text-muted-foreground max-w-16 truncate">{name}</span>
          </motion.div>
        ))}
      </motion.div>

      <div className="h-px bg-border" />

      {/* Posts */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col">
        {posts.map((post) => (
          <motion.article key={post.id} variants={item} className="border-b border-border px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground">
                {post.user.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-tight">{post.user}</p>
                <p className="text-xs text-muted-foreground">{post.handle} · {post.time}</p>
              </div>
              <button className="text-muted-foreground" aria-label="خيارات">
                <MoreHorizontal className="size-5" />
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-pretty">{post.text}</p>

            <motion.div
              whileHover={{ opacity: 0.95 }}
              className="mt-3 aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-muted to-secondary border border-border"
            />

            <div className="mt-3 flex items-center gap-5 text-foreground">
              <ActionButton icon={<Heart className="size-5" />} label={post.likes} />
              <ActionButton icon={<MessageCircle className="size-5" />} label={post.comments} />
              <ActionButton icon={<Send className="size-5" />} />
              <button className="mr-auto text-foreground" aria-label="حفظ">
                <Bookmark className="size-5" />
              </button>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </div>
  )
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label?: string }) {
  return (
    <motion.button whileTap={{ scale: 0.85 }} className="flex items-center gap-1.5 text-sm">
      {icon}
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </motion.button>
  )
}
