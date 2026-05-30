"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, Grid3x3, Film, Bookmark, Bell, Moon, Shield, LogOut, Edit2, Check, X } from "lucide-react"
import { auth } from "../../lib/firebase"
import { signOut, User, updateProfile } from "firebase/auth"
import { supabase } from "../../lib/supabase"

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
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhotoURL, setEditPhotoURL] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchUserPosts = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (data) setPosts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const currentUser = auth.currentUser
    setUser(currentUser)
    if (currentUser) {
      setEditName(currentUser.displayName || "")
      setEditPhotoURL(currentUser.photoURL || "")
      fetchUserPosts(currentUser.uid)
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateProfile(user, {
        displayName: editName,
        photoURL: editPhotoURL || null
      })
      setUser({ ...user, displayName: editName, photoURL: editPhotoURL } as User)
      setIsEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
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

  const stats = [
    { label: "منشور", value: posts.length.toString() },
    { label: "متابِع", value: "٠" }, // Placeholder for real followers count later
    { label: "يتابع", value: "٠" },
  ]

  return (
    <div className="pb-4 h-full overflow-y-auto [scrollbar-width:none]">
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

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-4 flex flex-col gap-3"
          >
            <input
              type="text"
              placeholder="الاسم"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-border bg-card p-2 text-sm focus:outline-none focus:border-foreground"
            />
            <input
              type="url"
              placeholder="رابط الصورة (اختياري)"
              value={editPhotoURL}
              onChange={(e) => setEditPhotoURL(e.target.value)}
              className="w-full rounded-lg border border-border bg-card p-2 text-sm focus:outline-none focus:border-foreground"
              dir="ltr"
            />
            <div className="flex gap-2">
               <button onClick={handleSaveProfile} disabled={saving} className="flex-1 rounded-lg bg-foreground py-2 text-sm font-semibold text-background flex justify-center items-center gap-1">
                 {saving ? <span className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <><Check className="size-4" /> حفظ</>}
               </button>
               <button onClick={() => setIsEditing(false)} disabled={saving} className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold flex justify-center items-center gap-1">
                 <X className="size-4" /> إلغاء
               </button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2 px-4 py-4">
            <button onClick={() => setIsEditing(true)} className="flex-1 rounded-lg bg-foreground py-2 text-sm font-semibold text-background flex justify-center items-center gap-1">
              <Edit2 className="size-4" /> تعديل الملف
            </button>
            <button className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold">
              مشاركة الملف
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
      {loading ? (
        <div className="py-10 flex justify-center">
           <div className="size-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      ) : posts.length > 0 ? (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              variants={item}
              className="aspect-square bg-gradient-to-br from-muted to-secondary overflow-hidden relative group"
            >
              {post.image_url ? (
                <img src={post.image_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="size-full flex items-center justify-center p-2 text-center text-xs text-muted-foreground break-words overflow-hidden">
                   {post.text.substring(0, 30)}...
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="py-12 text-center text-sm text-muted-foreground">لا توجد منشورات حالياً</div>
      )}

      {/* Settings list */}
      <div className="mt-4 px-4 pb-8">
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
