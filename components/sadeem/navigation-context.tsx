"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import { useSession } from "@/lib/auth-context"

interface NavigationContextType {
  selectedUserId: string | null
  setSelectedUserId: (id: string | null) => void
  storyViewerData: { stories: any[]; initialIndex: number } | null
  setStoryViewerData: (data: { stories: any[]; initialIndex: number } | null) => void
  showStoryUpload: boolean
  setShowStoryUpload: (show: boolean) => void
  showCreatePost: boolean
  setShowCreatePost: (show: boolean) => void
  showMediaStudio: boolean
  setShowMediaStudio: (show: boolean) => void
  initialReelId: string | null
  setInitialReelId: (id: string | null) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [selectedUserId, setSelectedUserIdState] = useState<string | null>(null)
  const [storyViewerData, setStoryViewerData] = useState<{ stories: any[]; initialIndex: number } | null>(null)
  const [showStoryUpload, setShowStoryUpload] = useState<boolean>(false)
  const [showCreatePost, setShowCreatePost] = useState<boolean>(false)
  const [showMediaStudio, setShowMediaStudio] = useState<boolean>(false)
  const [initialReelId, setInitialReelId] = useState<string | null>(null)
  const { data: session } = useSession()

  const setSelectedUserId = (id: string | null) => {
    if (id && session?.user?.id === id) {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'profile' }))
      setSelectedUserIdState(null)
    } else {
      setSelectedUserIdState(id)
    }
  }

  return (
    <NavigationContext.Provider value={{
      selectedUserId, setSelectedUserId,
      storyViewerData, setStoryViewerData,
      showStoryUpload, setShowStoryUpload,
      showCreatePost, setShowCreatePost,
      showMediaStudio, setShowMediaStudio
    }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider")
  }
  return context
}
