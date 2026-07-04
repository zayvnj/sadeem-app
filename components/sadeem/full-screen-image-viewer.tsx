"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useEffect } from "react"

interface FullScreenImageViewerProps {
  imageUrl: string | null
  onClose: () => void
}

export function FullScreenImageViewer({ imageUrl, onClose }: FullScreenImageViewerProps) {
  useEffect(() => {
    if (imageUrl) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [imageUrl])

  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="absolute top-6 right-6 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
          >
            <X className="size-6" />
          </button>
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            src={imageUrl}
            alt="Full screen view"
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
