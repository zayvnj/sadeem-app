"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ImagePlus, Loader2, Send, Sliders, Sparkles, Wand2, PlusSquare } from "lucide-react"
import { useSession } from "@/lib/auth-context"
import { useNavigation } from "./navigation-context"
import { createPost } from "@/app/actions/post"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { Haptics, ImpactStyle } from "@capacitor/haptics"
import { Capacitor } from "@capacitor/core"

interface MediaItem {
  id: string
  file: File
  url: string
  type: "IMAGE" | "VIDEO"
}

export function MediaStudio() {
  const { showMediaStudio, setShowMediaStudio } = useNavigation()
  const [mode, setMode] = useState<"GALLERY" | "CAPTION">("GALLERY")
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)

  const [loading, setLoading] = useState(false)
  const [caption, setCaption] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentUser = session?.user

  // Reset state when opened/closed
  useEffect(() => {
    if (showMediaStudio) {
      setMode("GALLERY")
      setMediaItems([])
      setSelectedIndex(0)
      setCaption("")
    }
  }, [showMediaStudio])

  const triggerHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newItems: MediaItem[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE"
    }))

    setMediaItems(prev => [...newItems, ...prev])
    setSelectedIndex(0)
  }

  const handleClose = () => {
    setShowMediaStudio(false)
  }

  const handleNext = () => {
    if (mediaItems.length === 0 && caption.trim() === "") {
      toast.error("يرجى اختيار ملف أو كتابة نص")
      return
    }
    setMode("CAPTION")
  }

  const handleBackToGallery = () => {
    setMode("GALLERY")
  }

  const handlePublish = async () => {
    setLoading(true)

    try {
      if (!currentUser) throw new Error("يجب تسجيل الدخول أولاً")

      let publicUrl = null
      let mediaType: "IMAGE" | "REEL" | null = null

      const selectedMedia = mediaItems[selectedIndex]

      if (selectedMedia) {
        const formData = new FormData()
        formData.append('file', selectedMedia.file)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        const uploadData = await uploadRes.json()

        if (!uploadData.success) {
          throw new Error("فشل في رفع الملف")
        }

        publicUrl = uploadData.url
        mediaType = selectedMedia.type === "VIDEO" ? 'REEL' : 'IMAGE'
      }

      if (!publicUrl && !caption.trim()) {
         throw new Error("لا يمكن نشر منشور فارغ")
      }

      const res = await createPost({
        caption,
        mediaUrl: publicUrl || undefined,
        mediaType: mediaType || "IMAGE"
      })

      if (!res.success) throw new Error(res.error || "فشل حفظ المنشور")

      toast.success("تم النشر بنجاح!")
      handleClose()

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
      {showMediaStudio && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col safe-area-top"
          dir="rtl"
        >
          {/* Header */}
          <header className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-md z-10 relative">
            <button
              onClick={mode === "GALLERY" ? handleClose : handleBackToGallery}
              className="p-2 -mr-2 hover:bg-secondary rounded-full transition-colors"
            >
              <X className="size-6" />
            </button>

            <h1 className="text-lg font-bold">
              {mode === "GALLERY" ? "استوديو سديم" : "منشور جديد"}
            </h1>

            {mode === "GALLERY" ? (
              <button
                onClick={handleNext}
                className="text-primary font-bold text-lg px-2 hover:opacity-80 transition-opacity disabled:opacity-50"
                disabled={mediaItems.length === 0}
              >
                التالي
              </button>
            ) : (
              <div className="w-10" /> // Spacer
            )}
          </header>

          {mode === "GALLERY" ? (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              {/* Main Preview Area */}
              <div className="relative w-full bg-black shrink-0" style={{ aspectRatio: "4/5" }}>
                {mediaItems.length > 0 ? (
                  <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
                    {mediaItems[selectedIndex].type === "VIDEO" ? (
                      <video
                        src={mediaItems[selectedIndex].url}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <motion.img
                        src={mediaItems[selectedIndex].url}
                        drag
                        dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                        dragElastic={0.2}
                        className="w-full h-full object-cover cursor-grab active:cursor-grabbing"
                        alt="Preview"
                      />
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-4">
                    <ImagePlus className="size-16 opacity-50" />
                    <p className="text-lg font-medium">يرجى اختيار صورة أو فيديو</p>
                  </div>
                )}

                {/* Tools UI placehoders */}
                {mediaItems.length > 0 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 z-10">
                    <button className="text-white hover:text-primary transition-colors p-1"><Sliders className="size-5" /></button>
                    <button className="text-white hover:text-primary transition-colors p-1"><Sparkles className="size-5" /></button>
                    <button className="text-white hover:text-primary transition-colors p-1"><Wand2 className="size-5" /></button>
                  </div>
                )}
              </div>

              {/* Bottom Area */}
              <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
                {/* Load Gallery Button */}
                <div className="p-4 flex items-center justify-between border-b border-border/50 z-10 bg-background/80 backdrop-blur-md">
                   <h2 className="font-bold text-lg">المعرض</h2>
                   <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-secondary/80 backdrop-blur-md text-foreground px-4 py-2 rounded-xl font-medium hover:bg-secondary transition-colors border border-border/50"
                  >
                    <PlusSquare className="size-4" />
                    تحميل المعرض
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,video/*"
                    multiple
                  />
                </div>

                {/* Thumbnails Grid */}
                <div className="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                   {mediaItems.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1">
                        {mediaItems.map((item, index) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedIndex(index)
                              triggerHaptic()
                            }}
                            className={`relative aspect-square overflow-hidden bg-secondary ${
                              selectedIndex === index ? "ring-2 ring-primary z-10" : "opacity-70 hover:opacity-100"
                            } transition-all`}
                          >
                            {item.type === "VIDEO" ? (
                              <>
                                <video src={item.url} className="w-full h-full object-cover" />
                                <div className="absolute top-1 right-1 bg-black/50 rounded p-0.5 backdrop-blur-sm">
                                  <span className="text-[10px] text-white font-bold">فيديو</span>
                                </div>
                              </>
                            ) : (
                              <img src={item.url} className="w-full h-full object-cover" alt="Thumbnail" />
                            )}
                          </button>
                        ))}
                      </div>
                   ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        لا توجد وسائط محددة
                      </div>
                   )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="caption"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col p-4 overflow-y-auto"
            >
               <div className="flex gap-4 items-start border-b border-border/50 pb-4">
                  {mediaItems.length > 0 && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-secondary relative">
                       {mediaItems[selectedIndex].type === "VIDEO" ? (
                          <video src={mediaItems[selectedIndex].url} className="w-full h-full object-cover" />
                       ) : (
                          <img src={mediaItems[selectedIndex].url} className="w-full h-full object-cover" alt="Selected" />
                       )}
                    </div>
                  )}
                  <textarea
                    placeholder="اكتب تعليقاً..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    disabled={loading}
                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-lg min-h-[120px] placeholder:text-muted-foreground/60 p-0 selectable-text"
                  />
               </div>

               <div className="mt-auto pt-6 pb-safe">
                 <button
                    onClick={handlePublish}
                    disabled={loading || (mediaItems.length === 0 && caption.trim() === "")}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground p-4 rounded-2xl font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <>
                        <span>مشاركة</span>
                        <Send className="size-5 rotate-180" />
                      </>
                    )}
                  </button>
               </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
