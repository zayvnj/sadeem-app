"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Loader2, X } from "lucide-react"
import { useSession } from "@/lib/auth-context"
import { createStory } from "@/app/actions/story"
import { bwToast } from "./ui/bw-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useStoriesStore } from "@/lib/stores/useStoriesStore"
import { useNavigation } from "./navigation-context"
import { CustomStoryGallery } from "./custom-story-gallery"
import { Capacitor } from "@capacitor/core"
import { uploadMediaToSupabase } from "@/lib/supabase-storage"

interface StoryUploadProps {
  onUploadComplete: () => void
  userAvatar?: string | null
}

export function StoryUpload({ onUploadComplete, userAvatar }: StoryUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFileType, setSelectedFileType] = useState<"image" | "video" | null>(null)
  const [showGallery, setShowGallery] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { addStory } = useStoriesStore()
  const { showStoryUpload, setShowStoryUpload, setStoryViewerData } = useNavigation()


  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const MAX_WIDTH = 1080
          const MAX_HEIGHT = 1920
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob)
              else reject(new Error("Canvas to Blob failed"))
            },
            "image/jpeg",
            0.8
          )
        }
      }
    })
  }

  const handleFileSelect = (file: File) => {
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    const maxVideoSize = 20 * 1024 * 1024 // 20MB limit for video

    if (isVideo && file.size > maxVideoSize) {
      bwToast.error("حجم الفيديو يجب أن يكون أقل من 20 ميجابايت")
      return
    }

    setSelectedFile(file)
    setSelectedFileType(isVideo ? 'video' : 'image')
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleWebFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const triggerSelect = async () => {
    if (Capacitor.isNativePlatform()) {
      setShowGallery(true)
    } else {
      fileInputRef.current?.click()
    }
  }

  const { data: session } = useSession()
  const currentUser = session?.user

  const handlePublish = async () => {
    if (!selectedFile) return

    if (!currentUser) {
      bwToast.error("يجب تسجيل الدخول لرفع قصة")
      return
    }

    setIsUploading(true)
    const toastId = bwToast.loading("جاري رفع القصة...")

    try {
      let uploadFile = selectedFile

      if (selectedFileType === 'image') {
        const compressedBlob = await compressImage(selectedFile)
        uploadFile = new File([compressedBlob], `story_${Date.now()}.jpg`, { type: 'image/jpeg' })
      }

      // 1. Upload via Supabase Storage
      const publicUrl = await uploadMediaToSupabase(uploadFile)

      // 2. Insert into stories table via Server Action
      const res = await createStory(publicUrl)

      if (!res.success || !res.data) {
        throw new Error(res.error || "فشل في حفظ القصة")
      }

      const newStory = {
        ...res.data,
        users: currentUser,
        user_id: currentUser.id
      }

      // Add to store
      addStory(newStory as any)

      bwToast.dismiss(toastId)
      bwToast.success("تم رفع القصة بنجاح")

      setPreviewUrl(null)
      setSelectedFile(null)
      onUploadComplete()

      // Auto open viewer directly without arbitrary timeouts
      setStoryViewerData({
        stories: [newStory as any],
        initialIndex: 0
      })
    } catch (error: any) {
      console.error("Story upload error:", error)
      bwToast.dismiss(toastId)
      bwToast.error(error.message || "حدث خطأ أثناء رفع القصة", () => handlePublish())
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleCancel = () => {
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <AnimatePresence>
        {showStoryUpload && !previewUrl && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[110] bg-black/90 flex flex-col items-center justify-center p-6"
           >
             <button
               onClick={() => setShowStoryUpload(false)}
               className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition"
             >
               <X className="size-6" />
             </button>

             <motion.div
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-zinc-900 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center text-center border border-zinc-800"
             >
               <div className="size-20 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 mb-6 flex items-center justify-center shadow-lg">
                 <Plus className="size-10 text-white" />
               </div>
               <h2 className="text-xl font-bold text-white mb-2">إضافة قصة جديدة</h2>
               <p className="text-zinc-400 text-sm mb-8">شارك لحظاتك اليومية مع أصدقائك. تختفي القصة بعد 24 ساعة.</p>

               <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleWebFileSelect}
               />
               <button
                 onClick={triggerSelect}
                 className="w-full py-4 rounded-2xl bg-white text-black font-bold text-base hover:bg-zinc-200 transition-colors"
               >
                 اختيار من المعرض
               </button>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[120] flex flex-col bg-black text-white"
          >
            <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <button
                onClick={handleCancel}
                className="rounded-full bg-black/40 p-2 backdrop-blur hover:bg-black/60 transition"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-900">
              {selectedFileType === 'video' ? (
                <video
                  src={previewUrl}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <button
                onClick={handlePublish}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-bold text-black disabled:opacity-50 transition-transform active:scale-95 text-lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    جاري النشر...
                  </>
                ) : (
                  "نشر القصة"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Native Custom Gallery Overlay */}
      {showGallery && (
        <CustomStoryGallery
          onClose={() => setShowGallery(false)}
          onSelect={(file) => {
            setShowGallery(false)
            handleFileSelect(file)
          }}
        />
      )}
    </>
  )
}
