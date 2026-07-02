"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ImagePlus, Film, Type, Sparkles, Camera, Loader2, CheckCircle2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { createPost } from "@/app/actions/post"
import { createStory } from "@/app/actions/story"

const options = [
  { icon: ImagePlus, title: "منشور", desc: "شارك صورة أو ألبوم", type: "post" },
  { icon: Film, title: "ريلز", desc: "فيديو قصير وممتع", type: "reel" },
  { icon: Camera, title: "قصة", desc: "تختفي بعد ٢٤ ساعة", type: "story" },
  { icon: Type, title: "نص", desc: "اكتب ما يدور في بالك", type: "text" },
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
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [caption, setCaption] = useState("")
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: session } = useSession()
  const currentUser = session?.user

  const handleUploadClick = (type: string) => {
    setSelectedType(type)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setSuccess(false)
    setErrorMsg("")

    try {
      if (!currentUser) throw new Error("يجب تسجيل الدخول أولاً")

      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const uploadData = await uploadRes.json()

      if (!uploadData.success) {
        throw new Error("فشل في رفع الملف")
      }

      const publicUrl = uploadData.url

      let res;
      if (selectedType === 'story') {
        res = await createStory(publicUrl)
      } else {
        res = await createPost({
          caption,
          mediaUrl: publicUrl,
          mediaType: selectedType === 'reel' ? 'REEL' : 'IMAGE'
        })
      }

      if (!res.success) throw new Error(res.error || "فشل حفظ المنشور")

      setSuccess(true)
      setCaption("")
      setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
      console.error("Upload error:", error)
      setErrorMsg(error.message || "حدث خطأ غير معروف أثناء الرفع")
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="px-5 py-6 overflow-y-auto h-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*"
      />
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
            onClick={() => handleUploadClick(opt.type)}
            className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-secondary p-6 hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <opt.icon className="size-6 text-foreground" />
            <div className="text-center">
              <p className="font-semibold text-sm">{opt.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence>
        {(loading || success || errorMsg) && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className={`mt-4 rounded-xl p-4 text-center text-sm font-semibold flex items-center justify-center gap-2 ${
              success ? "bg-green-500/10 text-green-500" :
              errorMsg ? "bg-red-500/10 text-red-500" :
              "bg-secondary text-foreground"
            }`}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {success && <CheckCircle2 className="size-4" />}
            <span>{errorMsg || (success ? "تم النشر بنجاح!" : "جاري الرفع...")}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
