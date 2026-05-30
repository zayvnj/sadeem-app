"use client"

import { motion } from "framer-motion"
import { ImagePlus, Film, Type, Sparkles, Camera } from "lucide-react"

const options = [
  { icon: ImagePlus, title: "منشور", desc: "شارك صورة أو ألبوم" },
  { icon: Film, title: "ريلز", desc: "فيديو قصير وممتع" },
  { icon: Camera, title: "قصة", desc: "تختفي بعد ٢٤ ساعة" },
  { icon: Type, title: "نص", desc: "اكتب ما يدور في بالك" },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 280, damping: 24 } },
}

export function AddView() {
  return (
    <div className="px-5 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-muted-foreground"
      >
        <Sparkles className="size-4" />
        <p className="text-sm">ماذا تريد أن تنشر اليوم؟</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="mt-5 grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <motion.button
            key={opt.title}
            variants={item}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-right transition-colors hover:bg-secondary"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
              <opt.icon className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{opt.title}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
            </span>
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="mt-4 rounded-2xl border-2 border-dashed border-border p-8 text-center"
      >
        <ImagePlus className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">اسحب الملفات هنا</p>
        <p className="mt-1 text-xs text-muted-foreground">أو اضغط للاختيار من المعرض</p>
      </motion.div>
    </div>
  )
}
