"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ImagePlus, Film, Loader2, X, Send } from "lucide-react"
import { useSession } from "@/lib/auth-context"
import { createPost } from "@/app/actions/post"
import { useNavigation } from "./navigation-context"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

export function CreatePostModal() {
  const { showCreatePost, setShowCreatePost } = useNavigation()
  const [loading, setLoading] = useState(false)
  const [caption, setCaption] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: session } = useSession()
  const currentUser = session?.user

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveMedia = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async () => {
    if (!caption.trim() && !selectedFile) {
      toast.error("يرجى كتابة نص أو إرفاق صورة/فيديو")
      return
    }

    setLoading(true)

    try {
      if (!currentUser) throw new Error("يجب تسجيل الدخول أولاً")

      let publicUrl = null
      let mediaType: "IMAGE" | "REEL" | null = null

      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        const uploadData = await uploadRes.json()

        if (!uploadData.success) {
          throw new Error("فشل في رفع الملف")
        }

        publicUrl = uploadData.url
        mediaType = selectedFile.type.startsWith('video/') ? 'REEL' : 'IMAGE'
      }

      const res = await createPost({
        caption,
        mediaUrl: publicUrl || undefined,
        mediaType: mediaType || "IMAGE"
      })

      if (!res.success) throw new Error(res.error || "فشل حفظ المنشور")

      toast.success("تم النشر بنجاح!")
      setCaption("")
      handleRemoveMedia()
      setShowCreatePost(false)

      // Invalidate posts query to refresh feed
      queryClient.invalidateQueries({ queryKey: ['feed', 'posts'] })

    } catch (error: any) {
      console.error("Post creation error:", error)
      toast.error(error.message || "حدث خطأ غير معروف أثناء الرفع")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {showCreatePost && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-6"
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="bg-background w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">إنشاء منشور</h2>
              <button
                onClick={() => setShowCreatePost(false)}
                className="p-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
                disabled={loading}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <textarea
                placeholder="بم تفكر؟..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={loading}
                className="w-full bg-transparent border-none focus:ring-0 resize-none text-lg min-h-[120px] placeholder:text-muted-foreground/60"
              />

              {previewUrl && (
                <div className="relative mt-4 rounded-2xl overflow-hidden bg-secondary border border-border group">
                  <button
                    onClick={handleRemoveMedia}
                    disabled={loading}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="size-4" />
                  </button>
                  {selectedFile?.type.startsWith('video/') ? (
                    <video src={previewUrl} className="w-full max-h-[300px] object-contain" controls />
                  ) : (
                    <img src={previewUrl} className="w-full max-h-[300px] object-contain" alt="Preview" />
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t flex items-center justify-between shrink-0 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*"
                  disabled={loading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="p-3 text-primary hover:bg-primary/10 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50"
                  title="إرفاق صورة أو فيديو"
                >
                  <ImagePlus className="size-6" />
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || (!caption.trim() && !selectedFile)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    <span>نشر</span>
                    <Send className="size-4 rotate-180" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}