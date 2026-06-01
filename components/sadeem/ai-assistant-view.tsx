"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

export function AIAssistantView() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="mb-6 rounded-full bg-primary/10 p-6"
      >
        <Sparkles className="size-16 text-primary" />
      </motion.div>
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-2 text-2xl font-bold"
      >
        المساعد الذكي
      </motion.h2>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground"
      >
        قريباً سيتم إضافة ميزات المساعد الذكي لمساعدتك في إنشاء المحتوى والتفاعل مع متابعيك.
      </motion.p>
    </div>
  )
}
