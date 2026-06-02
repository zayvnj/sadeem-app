"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Loader2, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { bwToast } from "./ui/bw-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useStoriesStore } from "@/lib/stores/useStoriesStore"
import { useNavigation } from "./navigation-context"
import { CustomStoryGallery } from "./custom-story-gallery"
import { Capacitor } from "@capacitor/core"

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
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error("Canvas to Blob failed"))
              }
            },
            "image/jpeg",
            0.8
          )
        }
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      bwToast.error("يرجى اختيار صورة أو فيديو للقصة")
      return
    }

    setSelectedFile(file)
    setSelectedFileType(file.type.startsWith("video/") ? "video" : "image")
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setShowGallery(false)
  }

  const handleGallerySelect = (file: File, type: "image" | "video") => {
    setSelectedFile(file)
    setSelectedFileType(type)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setShowGallery(false)
  }

  const handleAddClick = () => {
    if (isUploading) return
    if (Capacitor.isNativePlatform()) {
      setShowGallery(true)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handlePublish = async () => {
    if (!selectedFile) return

    const user = auth?.currentUser
    if (!user) {
      bwToast.error("يجب تسجيل الدخول لرفع قصة")
      return
    }

    setIsUploading(true)
    const toastId = bwToast.loading("جاري رفع القصة...")

    try {
      let uploadFile = selectedFile
      let filePath = `${user.uid}/stories/${Date.now()}`

      if (selectedFileType === 'image') {
        // 1. Compress Image
        const compressedBlob = await compressImage(selectedFile)
        uploadFile = new File([compressedBlob], `story_${Date.now()}.jpg`, { type: 'image/jpeg' })
        filePath += '.jpg'
      } else {
        filePath += '.mp4'
      }

      // 2. Upload to Storage (media bucket)
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, uploadFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      // 3. Insert into stories table
      const { data: insertedData, error: dbError } = await supabase
        .from('stories')
        .insert({
          user_id: user.uid,
          media_url: publicUrl,
        })
        .select('*, users:user_id(id, full_name, username, avatar_url, is_verified)')
        .single()

      if (dbError) throw dbError

      // Fetch user profile to ensure `users` relation is populated if the single select failed to populate it.
      let newStory = insertedData;
      if (!newStory.users) {
         const { data: userData } = await supabase.from('users').select('id, full_name, username, avatar_url, is_verified').eq('id', user.uid).single()
         newStory.users = userData;
      }

      // Add to store
      addStory(newStory)

      bwToast.dismiss(toastId)
      bwToast.success("تم رفع القصة بنجاح")

      setPreviewUrl(null)
      setSelectedFile(null)
      onUploadComplete()

      // Auto open viewer directly without arbitrary timeouts
      setStoryViewerData({
        stories: [newStory],
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
      {previewUrl && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed inset-0 z-[200] bg-black text-white flex flex-col"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 pt-16 z-10 flex items-center justify-end bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={handleCancel} className="p-2 rounded-full bg-black/40 backdrop-blur">
              <X className="size-6" />
            </button>
          </div>

          {/* Media Preview */}
          <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
            {selectedFileType === 'video' ? (
              <video
                src={previewUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={previewUrl}
                alt="Story Preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Footer - "Your Story" Button */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-10 flex justify-end">
            <button
              onClick={handlePublish}
              disabled={isUploading}
              className="flex items-center gap-3 bg-white/20 hover:bg-white/30 transition-colors backdrop-blur px-5 py-3 rounded-full text-white"
            >
              <div className="size-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-white/50">
                {isUploading ? (
                   <Loader2 className="size-4 animate-spin text-white" />
                ) : userAvatar ? (
                  <img src={userAvatar} alt="Your Avatar" className="size-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-black">م</span>
                )}
              </div>
              <span className="font-semibold">{isUploading ? 'جاري النشر...' : 'قصتك'}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <div className="flex flex-col items-center gap-1.5 shrink-0 relative">
      <div
        className="relative cursor-pointer"
        onClick={handleAddClick}
      >
        <div className="rounded-full p-[2px] ring-2 ring-border">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {isUploading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : userAvatar ? (
              <img src={userAvatar} alt="Your Avatar" className="size-full object-cover" />
            ) : (
              <div className="size-full bg-secondary flex items-center justify-center font-bold text-muted-foreground text-xl">
                م
              </div>
            )}
          </div>
        </div>

        {!isUploading && (
          <div className="absolute bottom-0 right-0 rounded-full bg-primary p-1 border-2 border-background shadow-sm">
            <Plus className="size-3 text-primary-foreground" />
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">قصتك</span>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>

    {/* Conditionally rendered fullscreen upload/editor triggered by context */}
    <AnimatePresence>
      {showStoryUpload && !previewUrl && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed inset-0 z-[200] bg-black text-white flex flex-col items-center justify-center"
        >
          <div className="absolute top-0 left-0 right-0 p-4 pt-16 z-10 flex items-center justify-end bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={() => setShowStoryUpload(false)} className="p-2 rounded-full bg-black/40 backdrop-blur">
              <X className="size-6" />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-xl font-bold">إنشاء قصة</h2>
            <p className="text-muted-foreground">اختر صورة أو فيديو لقصتك</p>
            <button
              onClick={handleAddClick}
              className="mt-4 bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:opacity-90"
            >
              <Plus className="size-5" />
              اختيار من المعرض
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showGallery && (
        <CustomStoryGallery
          onClose={() => setShowGallery(false)}
          onSelect={handleGallerySelect}
        />
      )}
    </AnimatePresence>
    </>
  )
}
