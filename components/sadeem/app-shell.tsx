"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Heart, Send } from "lucide-react"
import { onAuthStateChanged, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { BottomNav } from "./bottom-nav"
import { HomeFeed } from "./home-feed"
import { ReelsView } from "./reels-view"
import { AddView } from "./add-view"
import { ChatView } from "./chat-view"
import { ProfileView } from "./profile-view"
import { AuthView } from "./auth-view"
import { NotificationsView } from "./notifications-view"
import type { TabKey } from "./types"

const titles: Record<TabKey, string> = {
  home: "سديم",
  reels: "ريلز",
  add: "إنشاء",
  chat: "المحادثات",
  profile: "الملف الشخصي",
  notifications: "الإشعارات",
}

export function AppShell() {
  const [active, setActive] = useState<TabKey>("home")
  const [user, setUser] = useState<User | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [isSingleChatOpen, setIsSingleChatOpen] = useState(false)
  const isReels = active === "reels"

  useEffect(() => {
    if (!auth) {
      setLoadingAuth(false)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoadingAuth(false)
    })
    return () => unsubscribe()
  }, [])

  if (loadingAuth) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-background">
        <div className="size-8 rounded-full border-4 border-muted border-t-foreground animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-secondary p-0 sm:p-6">
        <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden sm:h-[860px] sm:rounded-[2.5rem] sm:border-8 sm:shadow-2xl bg-background sm:border-foreground">
          <AuthView />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-secondary p-0 sm:p-6">
      {/* Phone frame */}
      <div
        className={`relative flex h-dvh w-full max-w-md flex-col overflow-hidden sm:h-[860px] sm:rounded-[2.5rem] sm:border-8 sm:shadow-2xl transition-colors duration-300 ${
          isReels ? "bg-black sm:border-black" : "bg-background sm:border-foreground"
        }`}
      >
        {/* Header */}
        <header
          className={`flex shrink-0 items-center justify-between px-4 py-3 transition-colors duration-300 ${
            isReels ? "bg-black text-white" : "bg-background text-foreground"
          }`}
        >
          <motion.h1
            key={active}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: active === "home" ? "var(--font-sans)" : undefined }}
          >
            {titles[active]}
          </motion.h1>
          {active === "home" && (
            <div className="flex items-center gap-4">
              <button onClick={() => setActive("notifications")} className="rounded-full p-1 hover:bg-secondary transition-colors">
                <Heart className="size-6" />
              </button>
              <button onClick={() => setActive("chat")} className="rounded-full p-1 hover:bg-secondary transition-colors">
                <Send className="size-6" />
              </button>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute inset-0 ${isReels ? "" : "overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"}`}
            >
              {active === "home" && <HomeFeed />}
              {active === "reels" && <ReelsView />}
              {active === "add" && <AddView />}
              {active === "chat" && <ChatView onChatOpenStateChange={setIsSingleChatOpen} />}
              {active === "profile" && <ProfileView />}
              {active === "notifications" && <NotificationsView />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom navigation */}
        {!isSingleChatOpen && (
          <div className="shrink-0">
            <BottomNav active={active} onChange={setActive} dark={isReels} />
          </div>
        )}
      </div>
    </div>
  )
}
