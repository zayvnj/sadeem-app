"use client"

import { motion } from "framer-motion"
import { Home, Clapperboard, Sparkles, MessageCircle, User, Search, PlusSquare } from "lucide-react"
import type { TabKey } from "./types"
import { AstronautMascot } from "./AstronautMascot"
import { useNavigation } from "./navigation-context"
import { useSession } from "@/lib/auth-context"
import { useRef } from "react"

const tabs: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "الرئيسية", icon: Home },
  { key: "search", label: "البحث", icon: Search },
  { key: "reels", label: "ريلز", icon: Clapperboard },
  { key: "aiAssistant", label: "المساعد", icon: Sparkles },
  { key: "chat", label: "المحادثات", icon: MessageCircle },
  { key: "profile", label: "حسابي", icon: User },
]

export function BottomNav({
  active,
  onChange,
  dark,
  onAvatarLongPress
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
  dark?: boolean
  onAvatarLongPress?: () => void
}) {
  const { setShowMediaStudio } = useNavigation()
  const { data: session } = useSession()
  const currentUser = session?.user

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Insert the "Create" button in the middle
  const leftTabs = tabs.slice(0, 3)
  const rightTabs = tabs.slice(3)

  return (
    <nav
      className={`relative flex items-center justify-around border-t px-2 py-2 transition-colors duration-300 ${
        dark ? "border-white/10 bg-black text-white" : "border-border bg-background text-foreground"
      }`}
      id="bottom-nav-container"
    >
      <AstronautMascot activeTab={active} tabsKeys={tabs.map((t) => t.key)} dark={dark} />

      {leftTabs.map((tab, index) => {
        const isActive = active === tab.key
        return (
          <button
            key={tab.key}
            id={`nav-tab-${index}`}
            onClick={() => onChange(tab.key)}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center gap-1 py-1"
          >
            <motion.span animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }} whileTap={{ scale: 0.8 }}>
              <tab.icon className="size-6" strokeWidth={isActive ? 2.5 : 1.8} />
            </motion.span>
            <span className={`text-[10px] ${isActive ? "font-semibold" : "opacity-60"}`}>{tab.label}</span>
            {isActive && (
              <motion.span
                layoutId="nav-indicator"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`absolute -top-2 h-1 w-8 rounded-full ${dark ? "bg-white" : "bg-foreground"}`}
              />
            )}
          </button>
        )
      })}

      {/* Center Create Button */}
      <button
        onClick={() => setShowMediaStudio(true)}
        aria-label="إنشاء"
        className="relative flex flex-1 flex-col items-center gap-1 py-1 -mt-6 z-10 group"
      >
        <motion.div
          whileTap={{ scale: 0.8 }}
          className={`flex items-center justify-center rounded-full p-3 shadow-lg ${
            dark ? "bg-white text-black" : "bg-primary text-primary-foreground"
          }`}
        >
          <PlusSquare className="size-6" strokeWidth={2.5} />
        </motion.div>
        <span className="text-[10px] opacity-60">إنشاء</span>
      </button>

      {rightTabs.map((tab, index) => {
        const isActive = active === tab.key

        if (tab.key === "profile" && currentUser) {
          return (
            <button
              key={tab.key}
              id={`nav-tab-${index + 3}`}
              onClick={(e) => {
                 // If long press timer is null, it means it already fired.
                 // However, we set it to null in onPointerUp as well.
                 // To properly distinguish, we check a custom attribute or just rely on a ref flag.
              }}
              onPointerDown={(e) => {
                const target = e.currentTarget
                target.setAttribute('data-long-pressed', 'false')
                longPressTimerRef.current = setTimeout(() => {
                  target.setAttribute('data-long-pressed', 'true')
                  if (onAvatarLongPress) onAvatarLongPress()
                  longPressTimerRef.current = null
                }, 500)
              }}
              onPointerUp={(e) => {
                const isLongPressed = e.currentTarget.getAttribute('data-long-pressed') === 'true'
                if (longPressTimerRef.current) {
                  clearTimeout(longPressTimerRef.current)
                  longPressTimerRef.current = null
                }
                if (!isLongPressed) {
                  onChange(tab.key)
                }
              }}
              onPointerLeave={() => {
                if (longPressTimerRef.current) {
                  clearTimeout(longPressTimerRef.current)
                  longPressTimerRef.current = null
                }
              }}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center gap-1 py-1"
            >
              <motion.span animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }} whileTap={{ scale: 0.8 }}>
                <div className={`size-6 rounded-full overflow-hidden border-[1.5px] ${isActive ? (dark ? 'border-white' : 'border-black') : 'border-transparent'}`}>
                  {currentUser.image || currentUser.avatarUrl ? (
                    <img src={(currentUser.image || currentUser.avatarUrl) as string} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full bg-secondary flex items-center justify-center font-bold text-[10px] text-foreground">
                      {(currentUser.name || "م").charAt(0)}
                    </div>
                  )}
                </div>
              </motion.span>
              <span className={`text-[10px] ${isActive ? "font-semibold" : "opacity-60"}`}>{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="nav-indicator"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={`absolute -top-2 h-1 w-8 rounded-full ${dark ? "bg-white" : "bg-foreground"}`}
                />
              )}
            </button>
          )
        }

        return (
          <button
            key={tab.key}
            id={`nav-tab-${index + 3}`}
            onClick={() => onChange(tab.key)}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center gap-1 py-1"
          >
            <motion.span animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }} whileTap={{ scale: 0.8 }}>
              <tab.icon className="size-6" strokeWidth={isActive ? 2.5 : 1.8} />
            </motion.span>
            <span className={`text-[10px] ${isActive ? "font-semibold" : "opacity-60"}`}>{tab.label}</span>
            {isActive && (
              <motion.span
                layoutId="nav-indicator"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`absolute -top-2 h-1 w-8 rounded-full ${dark ? "bg-white" : "bg-foreground"}`}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
