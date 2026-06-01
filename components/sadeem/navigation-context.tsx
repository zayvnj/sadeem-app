"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

interface NavigationContextType {
  selectedUserId: string | null
  setSelectedUserId: (id: string | null) => void
  storyViewerData: { stories: any[]; initialIndex: number } | null
  setStoryViewerData: (data: { stories: any[]; initialIndex: number } | null) => void
  showStoryUpload: boolean
  setShowStoryUpload: (show: boolean) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [storyViewerData, setStoryViewerData] = useState<{ stories: any[]; initialIndex: number } | null>(null)
  const [showStoryUpload, setShowStoryUpload] = useState<boolean>(false)

  return (
    <NavigationContext.Provider value={{
      selectedUserId, setSelectedUserId,
      storyViewerData, setStoryViewerData,
      showStoryUpload, setShowStoryUpload
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
