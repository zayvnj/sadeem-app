"use client"

import { motion } from "framer-motion"
import { Sparkles, Search } from "lucide-react"

const aiAssistant = {
  name: "مساعد سديم الذكي",
  last: "كيف يمكنني مساعدتك اليوم؟",
  time: "الآن",
}

const chats = [
  { name: "نورة الشمري", last: "تمام، نتقابل بكرة 👍", time: "٩:٤١", unread: 2 },
  { name: "مجموعة العائلة", last: "سالم: تم إرسال الصور", time: "٨:١٥", unread: 5 },
  { name: "سالم العتيبي", last: "شكراً جزيلاً!", time: "أمس", unread: 0 },
  { name: "ليان الحربي", last: "تكتب الآن...", time: "أمس", unread: 0 },
  { name: "تركي", last: "أرسل ملصقاً", time: "الأحد", unread: 0 },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 280, damping: 26 } },
}

export function ChatView() {
  return (
    <div className="pb-4">
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
          <Search className="size-4 text-muted-foreground" />
          <input
            placeholder="ابحث في المحادثات"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* AI assistant pinned */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        className="mt-4 flex w-full items-center gap-3 px-4 py-3 text-right"
      >
        <span className="relative flex size-12 items-center justify-center rounded-full bg-foreground text-background">
          <Sparkles className="size-5" />
        </span>
        <span className="flex-1 border-b border-border pb-3">
          <span className="flex items-center justify-between">
            <span className="text-sm font-semibold">{aiAssistant.name}</span>
            <span className="text-xs text-muted-foreground">{aiAssistant.time}</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground truncate">{aiAssistant.last}</span>
        </span>
      </motion.button>

      <motion.ul variants={container} initial="hidden" animate="show">
        {chats.map((chat) => (
          <motion.li key={chat.name} variants={item}>
            <button className="flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-secondary">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
                {chat.name.charAt(0)}
              </span>
              <span className="flex-1">
                <span className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{chat.name}</span>
                  <span className="text-xs text-muted-foreground">{chat.time}</span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="block text-xs text-muted-foreground truncate">{chat.last}</span>
                  {chat.unread > 0 && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      {chat.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  )
}
