"use client"

import { motion } from "framer-motion"
import { Home, Clapperboard, Plus, MessageCircle, User } from "lucide-react"
import type { TabKey } from "./types"

const tabs: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "الرئيسية", icon: Home },
  { key: "reels", label: "ريلز", icon: Clapperboard },
  { key: "add", label: "إضافة", icon: Plus },
  { key: "chat", label: "المحادثات", icon: MessageCircle },
  { key: "profile", label: "حسابي", icon: User },
]

export function BottomNav({
  active,
  onChange,
  dark,
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
  dark?: boolean
}) {
  return (
    <nav
      className={`relative flex items-center justify-around border-t px-2 py-2 transition-colors duration-300 ${
        dark ? "border-white/10 bg-black text-white" : "border-border bg-background text-foreground"
      }`}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key
        const isAdd = tab.key === "add"

        if (isAdd) {
          return (
            <motion.button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              whileTap={{ scale: 0.85 }}
              whileHover={{ rotate: 90 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              aria-label={tab.label}
              className={`flex size-11 items-center justify-center rounded-xl ${
                dark ? "bg-white text-black" : "bg-foreground text-background"
              }`}
            >
              <Plus className="size-6" />
            </motion.button>
          )
        }

        return (
          <button
            key={tab.key}
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
