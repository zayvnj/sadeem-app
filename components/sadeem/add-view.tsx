"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ImagePlus, Film, Type, Sparkles, Camera, ArrowRight, Upload } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { auth } from "../../lib/firebase"

const options = [
  { icon: ImagePlus, title: "منشور", desc: "شارك صورة أو ألبوم", type: "post" },
  { icon: Film, title: "ريلز", desc: "فيديو قصير وممتع", type: "reel" },
  { icon: Camera, title: "قصة", desc: "تختفي بعد ٢٤ ساعة", type: "story" },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 280, damping: 24 } },
}

export function AddView() {
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const [text, setText] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()

    const user = auth.currentUser
    if (!user) {
      setMessage("يجب تسجيل الدخول أولاً")
      return
    }

    setLoading(true)
    setMessage("")

    const userName = user.displayName || "مستخدم"
    const userHandle = `@${userName.replace(/\s+/g, '_').toLowerCase()}`

    try {
      if (selectedType === "post") {
        const { error } = await supabase.from("posts").insert({
          user_id: user.uid,
          user_name: userName,
          user_handle: userHandle,
          text: text,
          image_url: mediaUrl || null,
          likes: 0,
          comments: 0
        })
        if (error) throw error
      } else if (selectedType === "reel") {
         const { error } = await supabase.from("reels").insert({
          user_id: user.uid,
          user_name: userName,
          user_handle: userHandle,
          caption: text,
          video_url: mediaUrl || null,
          likes: 0,
          comments: 0,
          sound: "صوت أصلي"
        })
        if (error) throw error
      } else if (selectedType === "story") {
         const { error } = await supabase.from("stories").insert({
          user_id: user.uid,
          user_name: userName,
          image_url: mediaUrl || null
        })
        if (error) throw error
      }

      setMessage("تم النشر بنجاح!")
      setText("")
      setMediaUrl("")
      setTimeout(() => {
        setSelectedType(null)
        setMessage("")
      }, 2000)
    } catch (err: any) {
      setMessage(err.message || "حدث خطأ أثناء النشر")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-5 py-6 overflow-y-auto h-full [scrollbar-width:none]">
      <AnimatePresence mode="wait">
        {!selectedType ? (
          <motion.div key="selector" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
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
                  onClick={() => setSelectedType(opt.type)}
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
          </motion.div>
        ) : (
          <motion.form
            key="composer"
            onSubmit={handlePublish}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <ArrowRight className="size-5" />
              </button>
              <h2 className="text-lg font-bold">
                {options.find(o => o.type === selectedType)?.title} جديد
              </h2>
            </div>

            {message && (
               <div className={`p-3 rounded-xl text-sm ${message.includes("بنجاح") ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                 {message}
               </div>
            )}

            {(selectedType === "post" || selectedType === "reel") && (
              <textarea
                placeholder="اكتب شيئاً..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                required={selectedType === "post" && !mediaUrl} // Require text if it's a post and no media
                className="w-full h-32 rounded-2xl border border-border bg-card p-4 text-sm focus:border-foreground focus:outline-none resize-none"
              />
            )}

            <div className="relative">
               <div className="absolute inset-y-0 right-3 flex items-center">
                  <Upload className="size-5 text-muted-foreground" />
               </div>
               <input
                 type="url"
                 placeholder={`رابط ${selectedType === 'reel' ? 'الفيديو' : 'الصورة'} (اختياري)`}
                 value={mediaUrl}
                 onChange={(e) => setMediaUrl(e.target.value)}
                 className="w-full rounded-xl border border-border bg-card py-3 pl-4 pr-10 text-sm focus:border-foreground focus:outline-none"
                 required={selectedType === "story" || selectedType === "reel"} // Require media for reels and stories
                 dir="ltr"
               />
            </div>

            <button
              type="submit"
              disabled={loading || (selectedType === 'post' && !text && !mediaUrl)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-transform active:scale-95 disabled:opacity-70"
            >
              {loading ? (
                 <span className="size-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : "نشر"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
