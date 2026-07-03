"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Heart, Send, PlusSquare } from "lucide-react"
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { toast } from 'sonner'
import { useSession } from "next-auth/react"
import { BottomNav } from "./bottom-nav"
import { HomeFeed } from "./home-feed"
import { ReelsView } from "./reels-view"
import { AddView } from "./add-view"
import { ChatView } from "./chat-view"
import { ProfileView } from "./profile-view"
import { PublicProfileView } from "./public-profile-view"
import { AuthView } from "./auth-view"
import { NotificationsView } from "./notifications-view"
import { AIAssistantView } from "./ai-assistant-view"
import { SearchView } from "./search-view"
import { NavigationProvider, useNavigation } from "./navigation-context"
import { Logo } from "./logo"
import { GlobalLoadingScreen } from "./global-loading"
import type { TabKey } from "./types"

const titles: Record<TabKey, string> = {
  home: "سديم",
  reels: "ريلز",
  add: "إنشاء",
  chat: "المحادثات",
  profile: "الملف الشخصي",
  notifications: "الإشعارات",
  aiAssistant: "المساعد الذكي",
  search: "البحث",
}

function AppShellContent() {
  const [active, setActive] = useState<TabKey>("home")
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status;
  const loadingAuth = status === "loading"
  const user = session?.user || null
  const [isSingleChatOpen, setIsSingleChatOpen] = useState(false)
  const { selectedUserId, setSelectedUserId } = useNavigation()
  const isReels = active === "reels"

  const [backPressCount, setBackPressCount] = useState(0)

  useEffect(() => {
    // Listen for custom event to switch tabs from deeply nested components
    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail) {
        setActive(customEvent.detail as TabKey)
      }
    }
    window.addEventListener('switch-tab', handleSwitchTab)

    return () => {
      window.removeEventListener('switch-tab', handleSwitchTab)
    }
  }, [])

  // Capacitor Hardware Back Button Handler (PopScope Equivalent)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const handleBackButton = async () => {
      // Priority 1: Close Modals/Overlays
      if (selectedUserId) {
        setSelectedUserId(null)
        return
      }

      if (isSingleChatOpen) {
        // Active chat view handles its own close state or we can reset to main chat tab
        setIsSingleChatOpen(false)
        setActive('chat')
        return
      }

      // Priority 2: Not on Home tab? Go to Home tab
      if (active !== 'home') {
        setActive('home')
        return
      }

      // Priority 3: On Home Tab, handle Double Tap to Exit
      if (backPressCount === 0) {
        setBackPressCount(1)
        toast('اضغط مرة أخرى للخروج', {
          duration: 2000,
          position: 'bottom-center'
        })
        setTimeout(() => setBackPressCount(0), 2000)
      } else if (backPressCount === 1) {
        App.exitApp()
      }
    }

    const backButtonListener = App.addListener('backButton', handleBackButton)

    return () => {
      backButtonListener.then(listener => listener.remove())
    }
  }, [active, selectedUserId, isSingleChatOpen, backPressCount, setSelectedUserId])

  return (
    <>
      <AnimatePresence>
        {loadingAuth && <GlobalLoadingScreen />}
      </AnimatePresence>

      {!loadingAuth && !user ? (
        <div className="flex min-h-dvh w-full items-center justify-center bg-secondary p-0 sm:p-6">
          <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden sm:h-[860px] sm:rounded-[2.5rem] sm:border-8 sm:shadow-2xl bg-background sm:border-foreground">
            <AuthView />
          </div>
        </div>
      ) : !loadingAuth && user ? (
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
          <motion.div
            key={active}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center"
          >
            {active === "home" ? (
              <Logo className="w-10 h-10" />
            ) : (
              <h1 className="text-xl font-bold tracking-tight">
                {titles[active]}
              </h1>
            )}
          </motion.div>
          {active === "home" && (
            <div className="flex items-center gap-4">
              <button onClick={() => setActive("add")} className="rounded-full p-1 hover:bg-secondary transition-colors">
                <PlusSquare className="size-6" />
              </button>
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
              {active === "aiAssistant" && <AIAssistantView />}
              {active === "search" && <SearchView />}
            </motion.div>
          </AnimatePresence>

          {/* Public Profile View Overlay */}
          <AnimatePresence>
            {selectedUserId && (
              <PublicProfileView
                userId={selectedUserId}
                onBack={() => setSelectedUserId(null)}
              />
            )}
          </AnimatePresence>
        </main>

          {/* Bottom navigation */}
          {!isSingleChatOpen && !selectedUserId && (
            <div className="shrink-0 overflow-visible relative z-50">
              <BottomNav active={active} onChange={setActive} dark={isReels} />
            </div>
          )}
        </div>
      </div>
      ) : null}
    </>
  )
}

export function AppShell() {
  return (
    <NavigationProvider>
      <AppShellContent />
    </NavigationProvider>
  )
}
