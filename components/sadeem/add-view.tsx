"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ImagePlus, Film, Type, Sparkles, Camera, Loader2, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"

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
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 280, damping: 24 } },
}

export function AddView() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [caption, setCaption] = useState("")
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const user = auth?.currentUser
      if (!user) throw new Error("يجب تسجيل الدخول أولاً")

      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.uid}/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      // 2. Insert into Post/Story database
      const tableName = selectedType === 'story' ? 'stories' : 'posts'

      const { error: dbError } = await supabase
        .from(tableName)
        .insert({
          user_id: user.uid,
          media_url: publicUrl,
          text: caption,
          type: selectedType
        })

      if (dbError) throw dbError

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
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-right transition-colors hover:bg-secondary disabled:opacity-50"
            disabled={loading}
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

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-500/10 p-4 text-green-600"
          >
            <CheckCircle2 className="size-5" />
            <p className="text-sm font-semibold">تم النشر بنجاح!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="mt-4"
      >
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="اكتب تعليقاً على منشورك (اختياري)..."
          className="w-full resize-none rounded-xl border border-border bg-card p-4 text-sm outline-none focus:border-foreground focus:ring-1 focus:ring-foreground min-h-[100px]"
        />
      </motion.div>

      <motion.button
        variants={item}
        initial="hidden"
        animate="show"
        onClick={() => handleUploadClick('post')}
        disabled={loading}
        className="mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 text-center transition-colors hover:bg-secondary/50 disabled:opacity-50"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-foreground" />
            <p className="text-sm font-medium">جاري الرفع...</p>
          </div>
        ) : (
          <>
            <ImagePlus className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">اسحب الملفات هنا</p>
            <p className="mt-1 text-xs text-muted-foreground">أو اضغط للاختيار من المعرض</p>
          </>
        )}
      </motion.button>

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center"
        >
          <p className="text-sm font-medium text-red-500">{errorMsg}</p>
        </motion.div>
      )}
    </div>
  )
}
