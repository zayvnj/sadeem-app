"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Settings, Grid3x3, Film, Bookmark, Bell, Moon, Shield, LogOut } from "lucide-react"
import { auth } from "../../lib/firebase"
import { signOut, User } from "firebase/auth"


const stats = [
  { label: "منشور", value: "٤٨" },
  { label: "متابِع", value: "١٢.٤ك" },
  { label: "يتابع", value: "٣١٠" },
]

const tabs = [
  { icon: Grid3x3, key: "grid" },
  { icon: Film, key: "reels" },
  { icon: Bookmark, key: "saved" },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 22 } },
}

export function ProfileView() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Current user should be set from AppShell, but fetching here just to be safe in case of standalone re-renders
    setUser(auth.currentUser)
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
  }

  const username = user?.displayName ? `@${user.displayName.replace(/\s+/g, '_').toLowerCase()}` : "@user_sadeem"
  const displayName = user?.displayName || "مستخدم سديم"
  const email = user?.email || ""
  const firstLetter = displayName.charAt(0).toUpperCase()

  const settings = [
    { icon: Bell, label: "الإشعارات" },
    { icon: Moon, label: "المظهر الداكن" },
    { icon: Shield, label: "الخصوصية والأمان" },
    { icon: LogOut, label: "تسجيل الخروج", onClick: handleLogout, isDestructive: true },
  ]

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-lg font-bold">{username}</h2>
        <button aria-label="الإعدادات" className="text-foreground">
          <Settings className="size-6" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5 px-4 py-5"
      >
        <div className="rounded-full p-[3px] ring-2 ring-foreground">
          {user?.photoURL ? (
            <div className="relative size-20 overflow-hidden rounded-full">
              {/* Using standard img to avoid Next.js external domain errors for firebase domains */}
              <img src={user.photoURL} alt={displayName} className="size-full object-cover" />
            </div>
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
              {firstLetter}
            </div>
          )}
        </div>
        <div className="flex flex-1 justify-around">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold leading-none">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="px-4">
        <p className="text-sm font-semibold">{displayName}</p>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {email}
        </p>
      </div>

      <div className="flex gap-2 px-4 py-4">
        <button className="flex-1 rounded-lg bg-foreground py-2 text-sm font-semibold text-background">
          تعديل الملف
        </button>
        <button className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold">
          مشاركة الملف
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-y border-border">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            className={`flex flex-1 justify-center py-3 ${i === 0 ? "border-b-2 border-foreground" : "text-muted-foreground"}`}
          >
            <t.icon className="size-5" />
          </button>
        ))}
      </div>

      {/* Grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-0.5 p-0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <motion.div
            key={i}
            variants={item}
            className="aspect-square bg-gradient-to-br from-muted to-secondary"
          />
        ))}
      </motion.div>

      {/* Settings list */}
      <div className="mt-4 px-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">الإعدادات</p>
        <div className="overflow-hidden rounded-2xl border border-border">
          {settings.map((s, i) => (
            <button
              key={s.label}
              onClick={s.onClick}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-secondary ${i !== settings.length - 1 ? "border-b border-border" : ""} ${s.isDestructive ? "text-red-500 hover:text-red-600" : ""}`}
            >
              <s.icon className={`size-5 ${s.isDestructive ? "text-red-500" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
