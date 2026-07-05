"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Camera, Music, Sparkles, Send, Check, ImageIcon, PlaySquare, ImagePlus, Loader2 } from "lucide-react"
import { useNavigation } from "./navigation-context"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { createPost } from "@/app/actions/post"
import { useQueryClient } from "@tanstack/react-query"

type MediaType = "POST" | "STORY" | "REEL"

export function MediaStudio() {
  const { showCreatePost, setShowCreatePost } = useNavigation()
  const [activeTab, setActiveTab] = useState<MediaType>("POST")
  const [mediaFiles, setMediaFiles] = useState<{ file: File; url: string }[]>([])
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [caption, setCaption] = useState("")
  const [loading, setLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentUser = session?.user

  // Cleanup object URLs on unmount or when files change
  useEffect(() => {
    return () => {
      mediaFiles.forEach((m) => URL.revokeObjectURL(m.url))
    }
  }, [mediaFiles])

  // Handle files selected from the native gallery input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }))

    // In a real app, you might prepend them to simulate a growing gallery
    setMediaFiles((prev) => [...newFiles, ...prev])

    // Automatically select the first newly added item if nothing is selected
    if (selectedIndices.length === 0) {
      setSelectedIndices([0])
    }
  }

  // Handle clicking a media item in the gallery
  const toggleSelect = (index: number) => {
    if (isMultiSelect) {
      if (selectedIndices.includes(index)) {
        setSelectedIndices(selectedIndices.filter((i) => i !== index))
      } else {
        setSelectedIndices([...selectedIndices, index])
      }
    } else {
      setSelectedIndices([index])
    }
  }

  const handleComingSoon = (feature: string) => {
    toast(`${feature} قريباً`, {
      icon: '✨',
      position: 'bottom-center'
    })
  }

  const handleSubmit = async () => {
    if (selectedIndices.length === 0) {
      toast.error("يرجى اختيار صورة أو فيديو")
      return
    }

    setLoading(true)

    try {
      if (!currentUser) throw new Error("يجب تسجيل الدخول أولاً")

      const fileToUpload = mediaFiles[selectedIndices[0]].file

      const formData = new FormData()
      formData.append('file', fileToUpload)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const uploadData = await uploadRes.json()

      if (!uploadData.success) {
        throw new Error("فشل في رفع الملف")
      }

      const publicUrl = uploadData.url
      // We only support ONE media file creation for now based on previous `createPost`
      let mediaTypeForDb: "IMAGE" | "REEL" = "IMAGE"

      if (activeTab === "REEL" || fileToUpload.type.startsWith("video/")) {
        mediaTypeForDb = "REEL"
      }

      if (activeTab === "STORY") {
         // Assuming creating a story would be done via createStory if it existed
         // Since we don't have createStory imported, let's just make it a post for now or show toast
         toast.success("تم رفع القصة بنجاح (محاكاة)")
         // Invalidate story query if needed
      } else {
        const res = await createPost({
          caption: caption || "",
          mediaUrl: publicUrl,
          mediaType: mediaTypeForDb
        })

        if (!res.success) throw new Error(res.error || "فشل حفظ المنشور")

        toast.success("تم النشر بنجاح!")
        queryClient.invalidateQueries({ queryKey: ['feed', 'posts'] })
      }

      resetAndClose()
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "حدث خطأ غير معروف أثناء الرفع")
    } finally {
      setLoading(false)
    }
  }

  const resetAndClose = () => {
    setCaption("")
    setSelectedIndices([])
    setIsMultiSelect(false)
    setMediaFiles([])
    setShowCreatePost(false)
  }

  return (
    <AnimatePresence>
      {showCreatePost && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] safe-area-top bg-black text-white flex flex-col overflow-hidden"
        >
          {/* Top Navigation */}
          <div className="flex items-center justify-between p-4 pb-2">
            <button onClick={resetAndClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="size-6" />
            </button>
            <div className="flex gap-4">
              {(["POST", "STORY", "REEL"] as MediaType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm font-bold pb-1 relative transition-colors ${
                    activeTab === tab ? "text-white" : "text-white/50"
                  }`}
                >
                  {tab === "POST" ? "منشور" : tab === "STORY" ? "قصة" : "ريلز"}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="studioTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleComingSoon("الإعدادات")}
              className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-0 pointer-events-none" // Kept for spacing balance
            >
              <X className="size-6" />
            </button>
          </div>

          {/* Quick Actions & Caption */}
          <div className="px-4 py-3 flex flex-col gap-4 shrink-0">
            {activeTab === "POST" && (
              <textarea
                placeholder="اكتب تعليقاً..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-white/10 rounded-xl p-3 border-none focus:ring-0 resize-none text-white placeholder:text-white/50 min-h-[80px]"
              />
            )}

            <div className="flex gap-2 justify-center">
              <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*,video/*"
                capture="environment"
                onChange={handleFileChange}
              />
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-1 flex-1 bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition-colors backdrop-blur-md"
              >
                <div className="bg-gradient-to-tr from-pink-500 to-violet-500 p-2 rounded-full">
                  <Camera className="size-5 text-white" />
                </div>
                <span className="text-xs font-semibold">الكاميرا</span>
              </button>

              <button
                onClick={() => handleComingSoon("القوالب")}
                className="flex flex-col items-center gap-1 flex-1 bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition-colors backdrop-blur-md"
              >
                <div className="bg-gradient-to-tr from-cyan-500 to-blue-500 p-2 rounded-full">
                  <Sparkles className="size-5 text-white" />
                </div>
                <span className="text-xs font-semibold">القوالب</span>
              </button>

              <button
                onClick={() => handleComingSoon("الموسيقى")}
                className="flex flex-col items-center gap-1 flex-1 bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition-colors backdrop-blur-md"
              >
                <div className="bg-gradient-to-tr from-orange-500 to-yellow-500 p-2 rounded-full">
                  <Music className="size-5 text-white" />
                </div>
                <span className="text-xs font-semibold">الموسيقى</span>
              </button>
            </div>
          </div>

          {/* Gallery Section */}
          <div className="flex-1 bg-black rounded-t-3xl flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">المعرض</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMultiSelect(!isMultiSelect)}
                  className={`p-1.5 rounded-full transition-colors ${
                    isMultiSelect ? "bg-primary text-white" : "bg-white/10 text-white"
                  }`}
                >
                  <ImagePlus className="size-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white/10 rounded-full text-sm font-semibold hover:bg-white/20 transition-colors"
                >
                  تحديد مجلد
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {mediaFiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/50 gap-4">
                  <ImageIcon className="size-16 opacity-50" />
                  <p>لا توجد وسائط. اضغط على الكاميرا أو تحديد مجلد.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {mediaFiles.map((media, index) => {
                    const isSelected = selectedIndices.includes(index)
                    const isVideo = media.file.type.startsWith("video/")
                    return (
                      <motion.div
                        key={media.url}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-square relative cursor-pointer overflow-hidden group"
                        onClick={() => toggleSelect(index)}
                      >
                        {isVideo ? (
                          <video
                            src={media.url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={media.url}
                            alt="Media preview"
                            className="w-full h-full object-cover"
                          />
                        )}

                        {isVideo && (
                          <div className="absolute bottom-1 right-1 text-white drop-shadow-md">
                            <PlaySquare className="size-4" />
                          </div>
                        )}

                        <div className={`absolute inset-0 bg-black/40 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`} />

                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">
                            <Check className="size-3" strokeWidth={3} />
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bottom Submit Action */}
            <AnimatePresence>
              {selectedIndices.length > 0 && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-4 left-4 right-4 z-50 flex justify-end"
                >
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
                  >
                    {loading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        <span>متابعة</span>
                        <Send className="size-4 rotate-180" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
