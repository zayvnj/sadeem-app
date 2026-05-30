"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Heart, Send } from "lucide-react"
import { BottomNav } from "./bottom-nav"
import { HomeFeed } from "./home-feed"
import { ReelsView } from "./reels-view"
import { AddView } from "./add-view"
import { ChatView } from "./chat-view"
import { ProfileView } from "./profile-view"
import { AuthView } from "./auth-view"
import type { TabKey } from "./types"
import { auth } from "../../lib/firebase"
import { onAuthStateChanged, User } from "firebase/auth"

const titles: Record<TabKey, string> = {
  home: "سديم",
  reels: "ريلز",
  add: "إنشاء",
  chat: "المحادثات",
  profile: "الملف الشخصي",
}

export function AppShell() {
  const [active, setActive] = useState<TabKey>("home")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const isReels = active === "reels"

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-foreground border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <AuthView />
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-secondary p-0 sm:p-6" dir="rtl">
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
          <div className="flex items-center gap-4">
            <Heart className="size-6" />
            <Send className="size-6" />
          </div>
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
              {active === "chat" && <ChatView />}
              {active === "profile" && <ProfileView />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom navigation */}
        <div className="shrink-0">
          <BottomNav active={active} onChange={setActive} dark={isReels} />
        </div>
      </div>
    </div>
  )
}
