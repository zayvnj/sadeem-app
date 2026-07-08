"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Camera, X, Play, Loader2 } from "lucide-react"
import { Media } from "@capacitor-community/media"
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera"
import { Capacitor } from "@capacitor/core"
import { bwToast } from "./ui/bw-toast"

export interface CustomStoryGalleryProps {
  onClose: () => void
  onSelect: (file: File, type: "image" | "video") => void
}

interface MediaAsset {
  id: string
  uri: string
  type: "image" | "video"
  duration?: number // in seconds, for videos
  dataUrl?: string
}

export function CustomStoryGallery({ onClose, onSelect }: CustomStoryGalleryProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false) // Though Capacitor Media plugin currently doesn't support pagination, we fetch all or a large chunk

  useEffect(() => {
    loadMedia()
  }, [])

  const loadMedia = async () => {
    setLoading(true)
    if (!Capacitor.isNativePlatform()) {
      bwToast.error("هذه الميزة متاحة فقط في تطبيق الموبايل")
      setLoading(false)
      return
    }

    try {
      // Fetch albums/media
      const { albums } = await Media.getAlbums()

      // Usually "Recent" or "Camera" album has what we need, but getMedia gets everything
      // NOTE: getMedias might fetch all. For pagination we might have to filter manually or slice.
      const result = await Media.getMedias({
        quantity: 100, // fetch latest 100
        sort: [{ key: 'creationDate', ascending: false }]
      })

      const fetchedAssets: MediaAsset[] = result.medias.map((media: any) => ({
        id: media.identifier,
        uri: media.uri || media.data || media.path,
        type: media.type === 'video' ? 'video' : 'image',
        duration: media.duration ? media.duration / 1000 : undefined,
        dataUrl: media.data
      }))

      setAssets(fetchedAssets)

    } catch (error) {
      console.error("Error loading media:", error)
      bwToast.error("حدث خطأ أثناء جلب الصور")
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ""
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleCameraClick = async () => {
    if (!Capacitor.isNativePlatform()) {
      bwToast.error("الكاميرا متاحة فقط في التطبيق")
      return
    }

    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      })

      if (image.webPath) {
        // Convert webPath to File
        const response = await fetch(image.webPath)
        const blob = await response.blob()
        const file = new File([blob], `camera_${Date.now()}.${image.format || 'jpg'}`, { type: `image/${image.format || 'jpeg'}` })
        onSelect(file, "image")
      }
    } catch (error) {
      console.error("Camera error:", error)
    }
  }

  const handleAssetClick = async (asset: MediaAsset) => {
    try {
      if (asset.dataUrl) {
         // Capacitor 6+ @capacitor-community/media returns base64 data for thumbnails/images sometimes, or we need to fetch via uri
         // To make it simple for the preview and upload, let's convert it to a File object

         // Fetch the actual file using capacitor web path or fetch if it's a content URI
         // Note: Accessing content:// URIs directly in fetch() works in Capacitor if it's converted or if we read it as base64
         // Let's use Capacitor FileSystem or directly fetch if it's a web safe URL.
         // Actually, if we have the URI, we can convert it to web path.
         const webPath = Capacitor.convertFileSrc(asset.uri)
         const response = await fetch(webPath)
         const blob = await response.blob()

         const ext = asset.type === 'video' ? 'mp4' : 'jpg'
         const mime = asset.type === 'video' ? 'video/mp4' : 'image/jpeg'
         const file = new File([blob], `media_${asset.id}.${ext}`, { type: mime })

         onSelect(file, asset.type)
      } else {
        const webPath = Capacitor.convertFileSrc(asset.uri)
         const response = await fetch(webPath)
         const blob = await response.blob()

         const ext = asset.type === 'video' ? 'mp4' : 'jpg'
         const mime = asset.type === 'video' ? 'video/mp4' : 'image/jpeg'
         const file = new File([blob], `media_${asset.id}.${ext}`, { type: mime })

         onSelect(file, asset.type)
      }
    } catch (error) {
      console.error("Error processing asset:", error)
      bwToast.error("لا يمكن معالجة هذا الملف")
    }
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 h-[100dvh] z-[250] bg-background text-foreground flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-safe border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <X className="size-6" />
          </button>
          <h2 className="text-xl font-bold">المعرض</h2>
        </div>
        <button onClick={handleCameraClick} className="p-2 bg-muted rounded-full text-foreground hover:bg-secondary">
          <Camera className="size-5" />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto bg-background grid grid-cols-3 gap-1 p-1 [scrollbar-width:none]">
        {loading ? (
          <div className="col-span-3 flex justify-center py-10">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : assets.length > 0 ? (
          assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => handleAssetClick(asset)}
              className="relative aspect-[9/16] bg-muted cursor-pointer overflow-hidden group"
            >
              <img
                src={asset.dataUrl ? `data:image/jpeg;base64,${asset.dataUrl}` : Capacitor.convertFileSrc(asset.uri)}
                alt="Media thumbnail"
                className="size-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
              {asset.type === "video" && (
                <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1 backdrop-blur-sm">
                  <Play className="size-3 fill-white" />
                  {formatDuration(asset.duration)}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-20 text-muted-foreground">
            لا توجد صور أو فيديوهات
          </div>
        )}
      </div>
    </motion.div>
  )
}
