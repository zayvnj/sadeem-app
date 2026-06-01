"use client"

import { useState, useRef } from "react"
import { Plus, Loader2, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface StoryUploadProps {
  onUploadComplete: () => void
  userAvatar?: string | null
}

export function StoryUpload({ onUploadComplete, userAvatar }: StoryUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط للقصة")
      return
    }

    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handlePublish = async () => {
    if (!selectedFile) return

    const user = auth?.currentUser
    if (!user) {
      toast.error("يجب تسجيل الدخول لرفع قصة")
      return
    }

    setIsUploading(true)
    const toastId = toast.loading("جاري رفع القصة...")

    try {
      // 1. Compress Image
      const compressedBlob = await compressImage(selectedFile)
      const compressedFile = new File([compressedBlob], `story_${Date.now()}.jpg`, { type: 'image/jpeg' })

      // 2. Upload to Storage (media bucket)
      const filePath = `${user.uid}/stories/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, compressedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      // 3. Insert into stories table
      const { error: dbError } = await supabase
        .from('stories')
        .insert({
          user_id: user.uid,
          media_url: publicUrl,
        })

      if (dbError) throw dbError

      toast.success("تم رفع القصة بنجاح", { id: toastId })
      setPreviewUrl(null)
      setSelectedFile(null)
      onUploadComplete()
    } catch (error: any) {
      console.error("Story upload error:", error)
      toast.error(error.message || "حدث خطأ أثناء رفع القصة", { id: toastId })
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
            <img
              src={previewUrl}
              alt="Story Preview"
              className="w-full h-full object-cover"
            />
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
        onClick={() => !isUploading && fileInputRef.current?.click()}
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
    </>
  )
}
